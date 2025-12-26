export interface Connection {
  service: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  connectedAt: number;
}

export interface PelotonConnection extends Connection {
  service: 'peloton';
  username?: string;
}

export type SupportedService = 'peloton';
