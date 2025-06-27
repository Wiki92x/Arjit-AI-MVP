// Mock Firebase implementation for development
import { EventEmitter } from 'events';

// Mock auth types to match Firebase's types
class MockAuth extends EventEmitter {
  currentUser: MockUser | null = null;
  
  constructor() {
    super();
    // Initialize with a default user for development
    this.currentUser = {
      uid: 'mock-user-id',
      email: 'test@example.com',
      getIdToken: async () => 'mock-token',
      displayName: 'Test User'
    };
  }
}

interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: () => Promise<string>;
}

// Export MockUser as User for component usage
type User = MockUser;

// Mock Google provider
class MockGoogleProvider {}

// Create instances
const auth = new MockAuth();
const googleProvider = new MockGoogleProvider();

// Mock Firebase auth methods
const signInWithEmailAndPassword = async (auth: MockAuth, email: string, password: string) => {
  console.log('Mock sign in with', email, password);
  return { user: auth.currentUser };
};

const createUserWithEmailAndPassword = async (auth: MockAuth, email: string, password: string) => {
  console.log('Mock create user with', email, password);
  auth.currentUser = {
    uid: 'new-mock-user-id',
    email: email,
    displayName: null,
    getIdToken: async () => 'mock-token'
  };
  return { user: auth.currentUser };
};

const signInWithPopup = async (auth: MockAuth, provider: MockGoogleProvider) => {
  console.log('Mock sign in with popup');
  return { user: auth.currentUser };
};

const signOut = async (auth: MockAuth) => {
  console.log('Mock sign out');
  auth.currentUser = null;
};

const onAuthStateChanged = (auth: MockAuth, callback: (user: MockUser | null) => void) => {
  // Initial call with current user
  callback(auth.currentUser);
  
  // Set up listener for changes
  auth.on('authStateChanged', callback);
  
  // Return unsubscribe function
  return () => {
    auth.off('authStateChanged', callback);
  };
};

// Export values
export {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};

// Export types separately with 'export type' syntax
export type { User };
