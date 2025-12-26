// https://gist.github.com/danieljmt/caf074f9b8e8263ba076aec7e86b1745
package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"strings"
	"time"

	"golang.org/x/net/html"
)

const (
	authDomain           = "auth.onepeloton.com"
	authClientID         = "WVoJxVDdPoFx4RNewvvg6ch2mZ7bwnsM"
	authAudience         = "https://api.onepeloton.com/"
	authScope            = "offline_access openid peloton-api.members:default"
	authRedirectURI      = "https://members.onepeloton.com/callback"
	auth0ClientPayload   = "eyJuYW1lIjoiYXV0aDAtc3BhLWpzIiwidmVyc2lvbiI6IjIuMS4zIn0="
	authAuthorizePath    = "/authorize"
	authTokenPath        = "/oauth/token"
	authRedirectLogLimit = 512
)

type client struct {
	username     string
	password     string
	httpClient   *http.Client
	bearer       string
	refreshToken string
	expiresIn    int
}

type oauthConfig struct {
	ClientID            string
	CodeChallenge       string
	CodeChallengeMethod string
	CodeVerifier        string
	State               string
	Nonce               string
	RedirectURI         string
	Audience            string
	Scope               string
	AuthDomain          string
}

func main() {
	username := strings.TrimSpace(os.Getenv("PELOTON_LOGIN"))
	password := strings.TrimSpace(os.Getenv("PELOTON_PASSWORD"))
	if username == "" || password == "" {
		log.Fatal("PELOTON_LOGIN and PELOTON_PASSWORD are required")
	}

	ctx := context.Background()
	c, err := newClient(username, password)
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}

	if err := c.loginWithOAuth(ctx); err != nil {
		log.Fatalf("OAuth login failed: %v", err)
	}

	// Output tokens as JSON for easy parsing
	output := map[string]interface{}{
		"access_token":  c.bearer,
		"refresh_token": c.refreshToken,
		"expires_in":    c.expiresIn,
	}
	jsonOutput, err := json.Marshal(output)
	if err != nil {
		log.Fatalf("Failed to marshal output: %v", err)
	}
	fmt.Println(string(jsonOutput))
}

func newClient(username, password string) (*client, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}

	return &client{
		username: username,
		password: password,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Jar:     jar,
		},
	}, nil
}

func (c *client) loginWithOAuth(ctx context.Context) error {
	cfg, err := generateOAuthConfig()
	if err != nil {
		return err
	}

	token, refreshToken, expiresIn, err := c.performOAuthLogin(ctx, cfg)
	if err != nil {
		return err
	}

	c.bearer = token
	c.refreshToken = refreshToken
	c.expiresIn = expiresIn
	return nil
}

func (c *client) performOAuthLogin(ctx context.Context, cfg *oauthConfig) (string, string, int, error) {
	if c.username == "" || c.password == "" {
		return "", "", 0, errors.New("missing credentials")
	}

	authorizeURL := buildAuthorizeURL(cfg)
	session, err := c.initiateAuthFlow(ctx, authorizeURL, cfg)
	if err != nil {
		return "", "", 0, fmt.Errorf("init flow: %w", err)
	}
	if session.State != "" {
		cfg.State = session.State
	}

	nextURL, err := c.submitCredentials(ctx, session, cfg)
	if err != nil {
		return "", "", 0, fmt.Errorf("submit credentials: %w", err)
	}

	code, err := c.followAuthorizationRedirects(ctx, nextURL, cfg)
	if err != nil {
		return "", "", 0, fmt.Errorf("finalize auth: %w", err)
	}

	token, refreshToken, expiresIn, err := c.exchangeCodeForToken(ctx, code, cfg)
	if err != nil {
		return "", "", 0, fmt.Errorf("token exchange: %w", err)
	}
	return token, refreshToken, expiresIn, nil
}

func generateOAuthConfig() (*oauthConfig, error) {
	verifier, err := generateRandomString(64)
	if err != nil {
		return nil, err
	}

	hash := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(hash[:])

	state, err := generateRandomString(32)
	if err != nil {
		return nil, err
	}

	nonce, err := generateRandomString(32)
	if err != nil {
		return nil, err
	}

	return &oauthConfig{
		ClientID:            authClientID,
		CodeVerifier:        verifier,
		CodeChallenge:       challenge,
		CodeChallengeMethod: "S256",
		State:               state,
		Nonce:               nonce,
		RedirectURI:         authRedirectURI,
		Audience:            authAudience,
		Scope:               authScope,
		AuthDomain:          authDomain,
	}, nil
}

func generateRandomString(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b)[:length], nil
}

func buildAuthorizeURL(cfg *oauthConfig) string {
	endpoint := fmt.Sprintf("https://%s%s", cfg.AuthDomain, authAuthorizePath)
	params := url.Values{}
	params.Set("client_id", cfg.ClientID)
	params.Set("audience", cfg.Audience)
	params.Set("scope", cfg.Scope)
	params.Set("response_type", "code")
	params.Set("response_mode", "query")
	params.Set("redirect_uri", cfg.RedirectURI)
	params.Set("state", cfg.State)
	params.Set("nonce", cfg.Nonce)
	params.Set("code_challenge", cfg.CodeChallenge)
	params.Set("code_challenge_method", cfg.CodeChallengeMethod)
	params.Set("auth0Client", auth0ClientPayload)
	return fmt.Sprintf("%s?%s", endpoint, params.Encode())
}

type authSession struct {
	LoginURL  string
	State     string
	CSRFToken string
}

func (c *client) initiateAuthFlow(ctx context.Context, authorizeURL string, cfg *oauthConfig) (*authSession, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, authorizeURL, nil)
	if err != nil {
		return nil, err
	}

	clientCopy := *c.httpClient
	var loginURL string
	clientCopy.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		if len(via) >= 10 {
			return errors.New("too many redirects")
		}
		if loginURL == "" && req != nil && req.URL != nil && len(via) >= 1 {
			loginURL = req.URL.String()
		}
		return nil
	}

	resp, err := clientCopy.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	authURL := &url.URL{Scheme: "https", Host: cfg.AuthDomain, Path: "/usernamepassword/login"}

	state := cfg.State
	csrf := extractCookieValue(clientCopy.Jar, authURL, "_csrf")

	if loginURL == "" && resp.Request != nil && resp.Request.URL != nil {
		loginURL = resp.Request.URL.String()
	}

	if loginURL == "" {
		return nil, errors.New("authorize redirect missing location")
	}

	parsed, err := url.Parse(loginURL)
	if err == nil {
		if qsState := parsed.Query().Get("state"); qsState != "" {
			state = qsState
		}
	}

	if csrf == "" {
		return nil, errors.New("missing CSRF token")
	}

	return &authSession{
		LoginURL:  loginURL,
		State:     state,
		CSRFToken: csrf,
	}, nil
}

func (c *client) submitCredentials(ctx context.Context, session *authSession, cfg *oauthConfig) (string, error) {
	payload := map[string]string{
		"client_id":             cfg.ClientID,
		"redirect_uri":          cfg.RedirectURI,
		"tenant":                "peloton-prod",
		"response_type":         "code",
		"scope":                 cfg.Scope,
		"audience":              cfg.Audience,
		"_csrf":                 session.CSRFToken,
		"state":                 session.State,
		"_intstate":             "deprecated",
		"nonce":                 cfg.Nonce,
		"username":              c.username,
		"password":              c.password,
		"connection":            "pelo-user-password",
		"code_challenge":        cfg.CodeChallenge,
		"code_challenge_method": cfg.CodeChallengeMethod,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	loginEndpoint := fmt.Sprintf("https://%s/usernamepassword/login", cfg.AuthDomain)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, loginEndpoint, strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Origin", fmt.Sprintf("https://%s", cfg.AuthDomain))
	req.Header.Set("Referer", session.LoginURL)
	req.Header.Set("Auth0-Client", "eyJuYW1lIjoiYXV0aDAuanMtdWxwIiwidmVyc2lvbiI6IjkuMTQuMyJ9")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}

	location := resp.Header.Get("Location")
	if location != "" {
		resp.Body.Close()
		return ensureAbsoluteURL(cfg.AuthDomain, location), nil
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	actionNext, hidden, err := parseHiddenForm(bodyBytes)
	if err != nil {
		return "", fmt.Errorf("login form parse failed: %s", truncate(string(bodyBytes), authRedirectLogLimit))
	}

	return c.submitHiddenForm(ctx, actionNext, hidden)
}

func (c *client) submitHiddenForm(ctx context.Context, action string, fields map[string]string) (string, error) {
	values := url.Values{}
	for k, v := range fields {
		values.Set(k, v)
	}

	actionURL := action
	if !strings.HasPrefix(actionURL, "http") {
		actionURL = ensureAbsoluteURL(authDomain, action)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, actionURL, strings.NewReader(values.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}

	location := resp.Header.Get("Location")
	resp.Body.Close()
	if location != "" {
		return ensureAbsoluteURL(authDomain, location), nil
	}

	return resp.Request.URL.String(), nil
}

func (c *client) followAuthorizationRedirects(ctx context.Context, startURL string, cfg *oauthConfig) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, startURL, nil)
	if err != nil {
		return "", err
	}

	clientCopy := *c.httpClient
	var callbackURL *url.URL
	clientCopy.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		if len(via) >= 10 {
			return errors.New("too many redirects")
		}
		if req.URL.Query().Get("code") != "" {
			callbackURL = req.URL
			return http.ErrUseLastResponse
		}
		return nil
	}

	resp, err := clientCopy.Do(req)
	if urlErr, ok := err.(*url.Error); ok && urlErr.Err == http.ErrUseLastResponse && resp != nil {
		err = nil
	}
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	finalURL := callbackURL
	if finalURL == nil && resp.Request != nil {
		finalURL = resp.Request.URL
	}

	code, state := extractCodeAndState(finalURL)
	if code == "" {
		if location := resp.Header.Get("Location"); location != "" {
			if u, err := url.Parse(location); err == nil {
				code, state = extractCodeAndState(u)
				if u.Host == "members.onepeloton.com" && code != "" {
					callbackURL = u
				}
			}
		}
	}
	if code == "" {
		return "", fmt.Errorf("authorization code not found (status %d): %s", resp.StatusCode, truncate(string(body), authRedirectLogLimit))
	}

	if state != "" {
		cfg.State = state
	}

	return code, nil
}

func (c *client) exchangeCodeForToken(ctx context.Context, code string, cfg *oauthConfig) (string, string, int, error) {
	endpoint := fmt.Sprintf("https://%s%s", cfg.AuthDomain, authTokenPath)
	payload := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     cfg.ClientID,
		"code_verifier": cfg.CodeVerifier,
		"code":          code,
		"redirect_uri":  cfg.RedirectURI,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return "", "", 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		return "", "", 0, fmt.Errorf("token exchange failed: %s", truncate(string(body), authRedirectLogLimit))
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"` // seconds until expiration
		TokenType    string `json:"token_type"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", "", 0, err
	}
	if tokenResp.AccessToken == "" {
		return "", "", 0, errors.New("token exchange response missing access token")
	}

	return tokenResp.AccessToken, tokenResp.RefreshToken, tokenResp.ExpiresIn, nil
}

func extractCodeAndState(u *url.URL) (string, string) {
	if u == nil {
		return "", ""
	}
	q := u.Query()
	return q.Get("code"), q.Get("state")
}

func parseHiddenForm(body []byte) (string, map[string]string, error) {
	doc, err := html.Parse(strings.NewReader(string(body)))
	if err != nil {
		return "", nil, err
	}

	var action string
	fields := make(map[string]string)

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "form" {
			for _, attr := range n.Attr {
				if strings.EqualFold(attr.Key, "action") {
					action = attr.Val
					break
				}
			}
		}
		if n.Type == html.ElementNode && n.Data == "input" {
			var name, value string
			var isHidden bool
			for _, attr := range n.Attr {
				switch strings.ToLower(attr.Key) {
				case "type":
					if strings.EqualFold(attr.Val, "hidden") {
						isHidden = true
					}
				case "name":
					name = attr.Val
				case "value":
					value = attr.Val
				}
			}
			if isHidden && name != "" {
				fields[name] = value
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}

	walk(doc)

	if action == "" {
		return "", nil, errors.New("hidden form had no action")
	}

	return action, fields, nil
}

func ensureAbsoluteURL(domain, action string) string {
	parsed, err := url.Parse(action)
	if err == nil && parsed.IsAbs() {
		return parsed.String()
	}
	if parsed == nil || parsed.Path == "" {
		parsed = &url.URL{Path: action}
	}
	parsed.Scheme = "https"
	parsed.Host = domain
	return parsed.String()
}

func extractCookieValue(jar http.CookieJar, target *url.URL, name string) string {
	if jar == nil || target == nil {
		return ""
	}
	for _, cookie := range jar.Cookies(target) {
		if cookie.Name == name && cookie.Value != "" {
			return cookie.Value
		}
	}
	return ""
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
