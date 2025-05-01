/**
 * Authentication utilities for RichmanManage
 */

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Session = {
  user: User | null;
  isAuthenticated: boolean;
};

export const getSession = async (): Promise<Session> => {
  return {
    user: null,
    isAuthenticated: false,
  };
};
