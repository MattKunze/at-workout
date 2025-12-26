default:
    just --list

dev:
    npm run dev

# Build the Peloton OAuth helper binary
build-peloton-oauth:
    cd cmd/peloton-oauth && go build -o ../../bin/peloton-oauth main.go

# Build all binaries
build: build-peloton-oauth
    npm run build

gemini:
    npx @google/gemini-cli
