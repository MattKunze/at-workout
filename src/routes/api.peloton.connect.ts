import type { ActionFunctionArgs } from 'react-router';
import { performOAuthLogin } from '../services/peloton.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');
    
    // Validate inputs
    if (!username || typeof username !== 'string') {
      return Response.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }
    
    if (!password || typeof password !== 'string') {
      return Response.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Perform OAuth login
    const result = await performOAuthLogin(username.trim(), password);
    
    return Response.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error('Peloton OAuth error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
