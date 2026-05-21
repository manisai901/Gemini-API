import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { Github, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { setUser } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/chat');
    }
  }, [user, authLoading, navigate]);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operationType: operation,
      path: path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const syncUserToFirestore = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || name,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          theme: 'dark'
        });
      } else {
        await setDoc(userRef, { updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}`);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        addToast('Welcome back!', 'success');
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        addToast('Account created successfully!', 'success');
      }
      
      try {
        await syncUserToFirestore(userCredential.user);
      } catch (err) {
        console.warn('Silent Firestore sync error:', err);
      }
      
      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || name,
        photoURL: userCredential.user.photoURL
      });
      
      navigate('/chat');
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        addToast('Login method not enabled in Firebase. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password and Google.', 'error');
      } else if (error.code === 'auth/email-already-in-use') {
        addToast('This email is already in use. Try signing in instead.', 'error');
      } else if (error.message.includes('Missing or insufficient permissions')) {
        addToast('Security Error: Insufficient permissions to save user data. Please ensure security rules are deployed correctly.', 'error');
      } else {
        addToast(error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
      
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      });
      
      addToast('Successfully signed in with Google!', 'success');
      navigate('/chat');
    } catch (error: any) {
      console.error('Google Auth error:', error);
      if (error.message.includes('Missing or insufficient permissions')) {
        addToast('Security Error: Insufficient permissions to save user data. Please check Firestore rules.', 'error');
      } else {
        addToast(error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-blueprint opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4f46e520,transparent)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Logo size="lg" className="mb-6" />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-neutral-500 mt-2 text-sm">
            Professional AI Engineering Framework
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="dev@mani.ai"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-neutral-900 px-4 text-neutral-500 font-medium tracking-widest">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleAuth}
              className="flex items-center justify-center gap-2 bg-black border border-neutral-800 rounded-xl py-3 text-sm font-medium hover:bg-neutral-900 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-black border border-neutral-800 rounded-xl py-3 text-sm font-medium hover:bg-neutral-900 transition-colors">
              <Github className="w-4 h-4" />
              GitHub
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-neutral-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
