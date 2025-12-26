import type { LoaderFunctionArgs } from 'react-router';

const PELOTON_API_BASE = 'https://api.onepeloton.com';

/**
 * Proxy endpoint for Peloton /api/user/{userId}/workouts
 * This endpoint proxies requests to Peloton's API to avoid CORS issues.
 * 
 * The client sends the access token via the Authorization header,
 * which is then forwarded to Peloton's API.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get the Authorization header from the client request
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return Response.json(
        { error: 'Not authenticated with Peloton' },
        { status: 401 }
      );
    }
    
    // Parse query parameters (e.g., limit, page)
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '10';
    const page = url.searchParams.get('page') || '0';
    
    // Forward the request to Peloton API with the same Authorization header
    const pelotonUrl = `${PELOTON_API_BASE}/api/user/${userId}/workouts?limit=${limit}&page=${page}`;
    const response = await fetch(pelotonUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Peloton API error:', response.status, errorText);
      
      return Response.json(
        { error: `Peloton API error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Peloton proxy error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
