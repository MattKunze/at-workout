import type { ActionFunctionArgs } from 'react-router';
import { refreshAccessToken } from '../services/peloton.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const refreshToken = formData.get('refreshToken');
    
    // Validate input
    if (!refreshToken || typeof refreshToken !== 'string') {
      return Response.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      );
    }
    
    // Perform token refresh
    const result = await refreshAccessToken(refreshToken.trim());
    
    return Response.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error('Peloton token refresh error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
