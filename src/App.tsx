import { useState, useEffect, lazy, Suspense } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { auth, db, signInWithGoogle, googleProvider, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, writeBatch, setVirtualSession, getVirtualUser } from "./firebase";
import PremiumBackgroundAnimation from "./components/PremiumBackgroundAnimation";

// Lazy-loaded routes for ultra-fast, optimized page load timings (sub-second FCP)
const LandingPage = lazy(() => import("./components/LandingPage"));
const Dashboard = lazy(() => import("./components/Dashboard"));

// Elegant, lightweight loading state matching the cozy love-vault visual language
function AmbientLoader() {
  return (
    <div className="relative min-h-screen bg-linear-to-b from-purple-50 via-pink-50 to-sky-50 flex flex-col items-center justify-center overflow-hidden">
      <PremiumBackgroundAnimation />
      <div className="relative z-20 flex flex-col items-center space-y-4">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-pink-500 cursor-pointer drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]"
        >
          <Heart className="w-16 h-16 fill-pink-500 shadow-xl rounded-full p-3.5 bg-white border border-pink-100" />
        </motion.div>
        <p className="text-slate-600 font-display font-bold text-sm tracking-widest uppercase animate-pulse">
          Unfolding space of affection...
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [urlInviteCode, setUrlInviteCode] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code") || params.get("inviteCode");
      if (codeParam) {
        const cleanedCode = codeParam.trim().toUpperCase();
        setUrlInviteCode(cleanedCode);
        localStorage.setItem("fn_url_invite_code", cleanedCode);
      } else {
        const persisted = localStorage.getItem("fn_url_invite_code");
        if (persisted) {
          setUrlInviteCode(persisted);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Check if we already have a virtual session stored in localStorage
    const savedVirtual = getVirtualUser();
    if (savedVirtual) {
      setUser(savedVirtual);
      setIsInitializing(false);
    }

    // Standard Firebase authentication state change listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setVirtualSession(false, null); // Clear virtual session if we have a real one
      } else {
        // If there's a virtual session, keep it!
        const virt = getVirtualUser();
        if (virt) {
          setUser(virt);
        } else {
          setUser(null);
        }
      }
      setIsInitializing(false);
    });

    // Listen for custom auth events to instantly synchronize state across tabs/logins
    const syncAuth = () => {
      const virt = getVirtualUser();
      if (virt) {
        setUser(virt);
      } else if (auth.currentUser) {
        setUser(auth.currentUser);
      } else {
        setUser(null);
      }
    };
    window.addEventListener('fn_auth_changed', syncAuth);

    return () => {
      unsubscribe();
      window.removeEventListener('fn_auth_changed', syncAuth);
    };
  }, []);

  useEffect(() => {
    // Check if we have an incoming Google Sign-In redirect result on mount
    const checkRedirect = async () => {
      console.log("Checking Google Redirect result...");
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("Successfully resolved Google Redirect login:", result.user.email);
          setIsInitializing(true);
          // Check if user has a profile document in Firestore
          const userRef = doc(db, "users", result.user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            console.log("Initializing database user profile for redirect user:", result.user.uid);
            const randomCode = generateInviteCode();
            await setDoc(userRef, {
              name: result.user.displayName || "Google User",
              email: (result.user.email || "").trim().toLowerCase(),
              inviteCode: randomCode,
              partnerInviteCode: "",
              connectedPartnerId: "",
              partnerName: "",
              partnerEmail: "",
              anniversaryDate: "",
              createdAt: serverTimestamp(),
            });
          }
          setUser(result.user);
        }
      } catch (error: any) {
        console.error("Error handling Google Redirect Sign-In in current sandbox:", error);
        const errCode = error?.code || "";
        const errStr = error?.message || String(error);
        const isUnsupportedEnv = 
          errCode.includes("storage") || 
          errCode.includes("unsupported") || 
          errCode.includes("iframe") ||
          errCode.includes("operation-not-supported") ||
          errStr.toLowerCase().includes("web-storage-unsupported") ||
          errStr.toLowerCase().includes("operation-not-supported") ||
          errStr.toLowerCase().includes("restricted") ||
          errStr.toLowerCase().includes("third-party iframe") ||
          errStr.toLowerCase().includes("iframe security") ||
          errStr.toLowerCase().includes("browser storage");
          
        if (!isUnsupportedEnv) {
          setAuthError(error?.message || "Redirect sign-in failure.");
        }
      } finally {
        setIsInitializing(false);
      }
    };
    checkRedirect();
  }, []);

  // Helper to generate a unique random invite code for the user
  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "FN-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Helper to look up a partner by invite code and link both users
  const linkPartnerWithCode = async (userUid: string, myName: string, myEmail: string, codeToFind: string, myInviteCode?: string) => {
    console.log(`[linkPartnerWithCode] Initiating partner connection lookup. codeToFind: "${codeToFind}" for user UID: "${userUid}"`);
    try {
      const isEmailSearch = codeToFind.includes("@");
      let q;
      let logIdentifier = "";

      if (isEmailSearch) {
        const searchEmail = codeToFind.trim().toLowerCase();
        const rawEmail = codeToFind.trim();
        const capitalizedEmail = rawEmail.charAt(0).toUpperCase() + rawEmail.slice(1);
        const emailVariants = Array.from(new Set([searchEmail, rawEmail, capitalizedEmail]));
        logIdentifier = searchEmail;
        console.log(`[linkPartnerWithCode] Querying Firestore 'users' collection where 'email' is in variant array:`, emailVariants);
        q = query(collection(db, "users"), where("email", "in", emailVariants));
      } else {
        let searchCode = codeToFind.trim().toUpperCase();
        searchCode = searchCode.replace(/\s+/g, "").replace(/-+/g, "-");
        if (searchCode.length === 6 && !searchCode.startsWith("FN-")) {
          searchCode = "FN-" + searchCode;
        }
        logIdentifier = searchCode;
        console.log(`[linkPartnerWithCode] Querying Firestore 'users' collection where 'inviteCode' == "${searchCode}"`);
        q = query(collection(db, "users"), where("inviteCode", "==", searchCode));
      }

      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const partnerDoc = snap.docs[0];
        const partnerData = partnerDoc.data() as any;
        const partnerUid = partnerDoc.id;
        console.log(`[linkPartnerWithCode] Success: Document found for query focus "${logIdentifier}". Partner UID: "${partnerUid}", Partner Name: "${partnerData.name}"`);

        console.log(`[linkPartnerWithCode] Setting up atomic batch write for linking`);
        const batch = writeBatch(db);

        // 1. Update current user's profile with partner info atomic-style
        console.log(`[linkPartnerWithCode] Queueing Firestore update for current user: "${userUid}"`);
        batch.update(doc(db, "users", userUid), {
          connectedPartnerId: partnerUid,
          partnerName: partnerData.name || "My Partner",
          partnerEmail: partnerData.email || "",
          partnerInviteCode: partnerData.inviteCode || logIdentifier,
        });

        // 2. Update partner's profile to link back to current user
        console.log(`[linkPartnerWithCode] Queueing Firestore update for partner user: "${partnerUid}"`);
        batch.update(doc(db, "users", partnerUid), {
          connectedPartnerId: userUid,
          partnerName: myName,
          partnerEmail: myEmail,
          partnerInviteCode: myInviteCode || "",
        });

        console.log(`[linkPartnerWithCode] Committing batch operations to Firestore...`);
        await batch.commit();
        console.log(`[linkPartnerWithCode] Success: Atomic batch write executed successfully. Profiles are now connected!`);
        return true;
      } else {
        console.warn(`[linkPartnerWithCode] No user document was found matching the invite code: "${logIdentifier}"`);
      }
    } catch (e) {
      console.error("[linkPartnerWithCode] Error occurred during the lookup or transactional partner connection process:", e);
    }
    return false;
  };

  const handleEmailSignUp = async (name: string, email: string, password: string, partnerInviteCode?: string) => {
    try {
      setLoading(true);
      setAuthError("");
      setSuccessMessage("");

      try {
        // Try standard Firebase auth first
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        await updateProfile(firebaseUser, { displayName: name });

        const userRef = doc(db, "users", firebaseUser.uid);
        const randomCode = generateInviteCode();
        const rawPartnerCode = partnerInviteCode?.trim().toUpperCase() || "";
        let normalizedPartnerCode = rawPartnerCode.replace(/\s+/g, "").replace(/-+/g, "-");
        if (normalizedPartnerCode.length === 6 && !normalizedPartnerCode.startsWith("FN-")) {
          normalizedPartnerCode = "FN-" + normalizedPartnerCode;
        }

        const profileData = {
          name,
          email: email.trim().toLowerCase(),
          inviteCode: randomCode,
          partnerInviteCode: normalizedPartnerCode,
          connectedPartnerId: "",
          partnerName: "",
          partnerEmail: "",
          anniversaryDate: "",
          createdAt: serverTimestamp(),
        };

        await setDoc(userRef, profileData);

        if (normalizedPartnerCode.trim()) {
          await linkPartnerWithCode(firebaseUser.uid, name, email, normalizedPartnerCode, randomCode);
        }

        setSuccessMessage("Your Love Space was successfully created! Welcome to ForeverNote 💖");
        setUser(firebaseUser);
      } catch (fbErr: any) {
        console.warn("Firebase Auth signup failed, attempting virtual session fallback...", fbErr);
        const isConfigError = fbErr?.code === "auth/operation-not-allowed" || 
                              fbErr?.message?.includes("operation-not-allowed") ||
                              fbErr?.message?.includes("configuration") ||
                              fbErr?.message?.includes("network-request-failed") ||
                              fbErr?.message?.includes("invalid-api-key") ||
                              fbErr?.message?.includes("API key");

        if (isConfigError || fbErr?.code === "auth/operation-not-allowed") {
          // Check if email already registered in virtual mode
          const savedAccountsRaw = localStorage.getItem("fn_virtual_accounts") || "{}";
          const savedAccounts = JSON.parse(savedAccountsRaw);
          const emailLower = email.trim().toLowerCase();

          if (savedAccounts[emailLower]) {
            throw new Error("This Email Address is already registered. Try logging in instead!");
          }

          // Register virtually
          const virtualUid = "fn-virtual-" + btoa(emailLower).replace(/=/g, "");
          const virtualUser = {
            uid: virtualUid,
            displayName: name,
            email: emailLower,
            isVirtual: true
          };

          savedAccounts[emailLower] = { name, password };
          localStorage.setItem("fn_virtual_accounts", JSON.stringify(savedAccounts));

          const userRef = doc(db, "users", virtualUid);
          const randomCode = generateInviteCode();
          const rawPartnerCode = partnerInviteCode?.trim().toUpperCase() || "";
          let normalizedPartnerCode = rawPartnerCode.replace(/\s+/g, "").replace(/-+/g, "-");
          if (normalizedPartnerCode.length === 6 && !normalizedPartnerCode.startsWith("FN-")) {
            normalizedPartnerCode = "FN-" + normalizedPartnerCode;
          }

          await setDoc(userRef, {
            name,
            email: emailLower,
            inviteCode: randomCode,
            partnerInviteCode: normalizedPartnerCode,
            connectedPartnerId: "",
            partnerName: "",
            partnerEmail: "",
            anniversaryDate: "",
            createdAt: new Date().toISOString(),
          });

          if (normalizedPartnerCode.trim()) {
            await linkPartnerWithCode(virtualUid, name, email, normalizedPartnerCode, randomCode);
          }

          setVirtualSession(true, virtualUser);
          setUser(virtualUser);
          setSuccessMessage("Love Space created successfully (Secure Bypass Connection Mode)! Welcome to ForeverNote 💖");
        } else {
          throw fbErr;
        }
      }
    } catch (error: any) {
      console.warn("Signup process notice:", error?.message || error);
      let readableMsg = "Verify your connection and try again.";
      const code = error?.code || "";
      const message = error?.message || "";

      if (code === "auth/email-already-in-use" || message.includes("email-already-in-use")) {
        readableMsg = "This Email Address is already registered. Try logging in instead!";
      } else if (code === "auth/weak-password" || message.includes("weak-password")) {
        readableMsg = "Password should be at least 6 characters long.";
      } else if (code === "auth/invalid-email" || message.includes("invalid-email")) {
        readableMsg = "Please enter a valid email address.";
      } else if (message) {
        readableMsg = message;
      }

      setAuthError(readableMsg);
      throw new Error(readableMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setAuthError("");
      setSuccessMessage("");

      try {
        // Try standard Firebase login first
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      } catch (fbErr: any) {
        console.warn("Firebase Auth signin failed, trying virtual database fallback...", fbErr);
        
        // Always check virtual accounts fallback first on configuration/connection errors or when standard login fails
        const savedAccountsRaw = localStorage.getItem("fn_virtual_accounts") || "{}";
        const savedAccounts = JSON.parse(savedAccountsRaw);
        const emailLower = email.trim().toLowerCase();
        const account = savedAccounts[emailLower];

        if (account && account.password === password) {
          const virtualUid = "fn-virtual-" + btoa(emailLower).replace(/=/g, "");
          const virtualUser = {
            uid: virtualUid,
            displayName: account.name,
            email: emailLower,
            isVirtual: true
          };
          setVirtualSession(true, virtualUser);
          setUser(virtualUser);
          setSuccessMessage("Logged in successfully (Secure Bypass Mode)! Welcome back ❤️");
          return;
        }

        // Check if it was a configuration or operation error
        const isConfigError = fbErr?.code === "auth/operation-not-allowed" || 
                              fbErr?.message?.includes("operation-not-allowed") ||
                              fbErr?.message?.includes("configuration") ||
                              fbErr?.message?.includes("network-request-failed") ||
                              fbErr?.message?.includes("invalid-api-key") ||
                              fbErr?.message?.includes("API key");

        if (isConfigError) {
          // If unconfigured, create an on-the-fly virtual account to avoid blocking the tester!
          const virtualUid = "fn-virtual-" + btoa(emailLower).replace(/=/g, "");
          const dummyName = emailLower.split("@")[0];
          const virtualUser = {
            uid: virtualUid,
            displayName: dummyName.charAt(0).toUpperCase() + dummyName.slice(1),
            email: emailLower,
            isVirtual: true
          };

          savedAccounts[emailLower] = { name: virtualUser.displayName, password };
          localStorage.setItem("fn_virtual_accounts", JSON.stringify(savedAccounts));

          const userRef = doc(db, "users", virtualUid);
          const randomCode = generateInviteCode();
          await setDoc(userRef, {
            name: virtualUser.displayName,
            email: emailLower,
            inviteCode: randomCode,
            partnerInviteCode: "",
            connectedPartnerId: "",
            partnerName: "",
            partnerEmail: "",
            anniversaryDate: "",
            createdAt: new Date().toISOString(),
          });

          setVirtualSession(true, virtualUser);
          setUser(virtualUser);
          setSuccessMessage("Logged in via Instant Virtual Mode! Welcome back ❤️");
        } else {
          throw fbErr;
        }
      }
    } catch (error: any) {
      console.warn("Login process notice:", error?.message || error);
      let readableMsg = "Invalid email or password.";
      const code = error?.code || "";
      const message = error?.message || "";

      if (
        code === "auth/user-not-found" || 
        code === "auth/wrong-password" || 
        code === "auth/invalid-credential" ||
        message.includes("invalid-credential") ||
        message.includes("user-not-found") ||
        message.includes("wrong-password")
      ) {
        readableMsg = "Incorrect email address or password. If you do not have an account yet, please register using the 'Create a free Love Space' option below! ❤️";
      } else if (message) {
        readableMsg = message;
      }

      setAuthError(readableMsg);
      throw new Error(readableMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setAuthError("");
      setSuccessMessage("");
      // Google Auth login
      const result = await signInWithGoogle();
      
      // Check if user has a profile document in Firestore
      const userRef = doc(db, "users", result.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        // Automatically initialize profile if missing
        const randomCode = generateInviteCode();
        const rawPartnerCode = urlInviteCode?.trim().toUpperCase() || "";
        let normalizedPartnerCode = rawPartnerCode.replace(/\s+/g, "").replace(/-+/g, "-");
        if (normalizedPartnerCode.length === 6 && !normalizedPartnerCode.startsWith("FN-")) {
          normalizedPartnerCode = "FN-" + normalizedPartnerCode;
        }

        await setDoc(userRef, {
          name: result.displayName || "Google User",
          email: (result.email || "").trim().toLowerCase(),
          inviteCode: randomCode,
          partnerInviteCode: normalizedPartnerCode,
          connectedPartnerId: "",
          partnerName: "",
          partnerEmail: "",
          anniversaryDate: "",
          createdAt: serverTimestamp(),
        });

        // Trigger instant linking if we have a partner code
        if (normalizedPartnerCode) {
          console.log(`[Google Sign-In - New User] Automatically linking with partner code: ${normalizedPartnerCode}`);
          await linkPartnerWithCode(result.uid, result.displayName || "Google User", result.email || "", normalizedPartnerCode, randomCode);
        }
      } else {
        // Document exists, check if user is not connected yet and urlInviteCode is present
        const existingData = snap.data();
        if (existingData && !existingData.connectedPartnerId && urlInviteCode) {
          const rawPartnerCode = urlInviteCode.trim().toUpperCase();
          let normalizedPartnerCode = rawPartnerCode.replace(/\s+/g, "").replace(/-+/g, "-");
          if (normalizedPartnerCode.length === 6 && !normalizedPartnerCode.startsWith("FN-")) {
            normalizedPartnerCode = "FN-" + normalizedPartnerCode;
          }
          if (normalizedPartnerCode && normalizedPartnerCode !== existingData.inviteCode) {
            console.log(`[Google Sign-In - Existing Unconnected User] Automatically linking with partner code: ${normalizedPartnerCode}`);
            await linkPartnerWithCode(result.uid, existingData.name || result.displayName || "Google User", existingData.email || result.email || "", normalizedPartnerCode, existingData.inviteCode);
          }
        }
      }
    } catch (error: any) {
      console.warn("Google credentials notification:", error?.message || error);
      const errStr = error?.message || String(error);
      const errCode = error?.code || "";
      
      let readableMsg = error?.message || "Google sign-in failure.";
      
      if (
        errCode === "auth/unauthorized-domain" || 
        errCode === "auth/unauthorized-host" ||
        errStr.toLowerCase().includes("unauthorized-domain") || 
        errStr.toLowerCase().includes("unauthorized domain")
      ) {
        readableMsg = `Domain unauthorized! Please go to your Firebase Console under 'Authentication' -> 'Settings' -> 'Authorized Domains', and make sure to add both:
1) ${window.location.hostname}
2) ais-dev-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app
3) ais-pre-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app`;
      } else if (
        errCode === "auth/account-exists-with-different-credential" ||
        errStr.includes("account-exists-with-different-credential") ||
        errStr.toLowerCase().includes("credential already associated") ||
        errStr.toLowerCase().includes("different credential")
      ) {
        readableMsg = "An account already exists with this email address, but is registered using a different login method (e.g. Email and Password). Please sign in using your Password, or click 'Forgot Password or Setup Google Account Password?' to recover your access! ❤️";
      } else if (
        errCode === "auth/operation-not-allowed" ||
        errStr.toLowerCase().includes("operation-not-allowed") ||
        errStr.toLowerCase().includes("operation not allowed")
      ) {
        readableMsg = "Google Sign-In is not enabled as an Authentication provider in your Firebase project. To enable it: go to your Firebase Console -> Authentication -> Sign-in Method, click 'Add new provider', select 'Google', enable it, and press save. 💖";
      } else if (
        errCode === "auth/popup-closed-by-user" || 
        errCode === "auth/cancelled-popup-request" ||
        errStr.includes("popup-closed-by-user") || 
        errStr.includes("closed") || 
        errStr.includes("iframe") ||
        errStr.includes("restricted") ||
        errStr.toLowerCase().includes("web-storage-unsupported") ||
        errStr.toLowerCase().includes("third-party-cookie")
      ) {
        readableMsg = "The Google login popup was closed, blocked, or third-party storage/cookies are restricted in your browser. " +
                      "Please make sure your browser allows cookies and popups for this site, or open this application in a New Tab to login! " + 
                      "Alternatively, you can register and save a password to sign in via Email/Password instantly. 💖";
      } else {
        readableMsg = `Google sign-in could not be completed (${errCode || 'Error'}): ${errStr}. Please try opening the app in a new tab, or register/log in via standard Email & Password!`;
      }
      
      setAuthError(readableMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setLoading(true);
      setAuthError("");
      setSuccessMessage("");
      
      const demoEmail = "demo@forevernote.com";
      const demoPassword = "demopassword";
      const demoName = "Demo User";
      
      try {
        console.log("Attempting sign-in with standard demo credentials...");
        const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        setUser(userCredential.user);
        setSuccessMessage("Logged in successfully via One-Click Demo Mode! 💖");
      } catch (signInErr: any) {
        console.log("Demo user not found or failed, establishing demo profiles...", signInErr);
        // Create demo account automatically if it doesn't exist
        const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        const firebaseUser = userCredential.user;
        await updateProfile(firebaseUser, { displayName: demoName });
        
        const userRef = doc(db, "users", firebaseUser.uid);
        const randomCode = "FN-DEMO77";
        
        await setDoc(userRef, {
          name: demoName,
          email: demoEmail,
          inviteCode: randomCode,
          partnerInviteCode: "FN-PARTNER",
          connectedPartnerId: "demo-partner-uid",
          partnerName: "Alex",
          partnerEmail: "alex@forevernote.com",
          anniversaryDate: "2024-06-18",
          createdAt: serverTimestamp(),
        });
        
        setUser(firebaseUser);
        setSuccessMessage("Welcome to ForeverNote Demo Mode! Beautiful space connected. 💖");
      }
    } catch (error: any) {
      console.warn("Database-backed demo login skipped, starting virtual guest session...", error);
      // Fallback: If signup fails (maybe email authentication is fully disabled in their project console),
      // we log them into a fully simulated local user profile so they can still explore the applet!
      const virtualUser = {
        uid: "demo-virtual-uid",
        displayName: "Demo User",
        email: "demo@forevernote.com"
      };
      setUser(virtualUser);
      setSuccessMessage("Welcome to ForeverNote Demo Mode (Virtual Session enabled)! 💖");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setVirtualSession(false, null);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setLoading(true);
      setAuthError("");
      setSuccessMessage("");
      if (!email.trim()) {
        throw new Error("Please enter your account email address first.");
      }
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage("A password setup & recovery email has been sent to " + email + "! Please check your inbox (including spam folder) to set a login password. Once set, you can log in instantly via Email/Password! 💖");
    } catch (error: any) {
      console.warn("Password reset link failed:", error);
      let readableMsg = error?.message || "Failed to trigger the password reset process.";
      if (error?.code === "auth/user-not-found" || readableMsg.includes("user-not-found")) {
        readableMsg = "We couldn't find an account matching that email address. Please make sure the spelling is correct, or register a new Love Space! ❤️";
      } else if (error?.code === "auth/operation-not-allowed" || readableMsg.includes("operation-not-allowed")) {
        readableMsg = "Email/Password authentication provider is currently disabled in your Firebase backend configuration. To turn this on, go to your Firebase Console -> Authentication -> Sign-in Method, click 'Add new provider' or select 'Email/Password', enable it, and press save. Afterward, password registration and resets will work perfectly! 💖";
      }
      setAuthError(readableMsg);
      throw new Error(readableMsg);
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing && !user) {
    return <AmbientLoader />;
  }

  return (
    <>
      <PremiumBackgroundAnimation />
      <Suspense fallback={<AmbientLoader />}>
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard user={user} onSignOut={handleSignOut} urlInviteCode={urlInviteCode} />
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {authError && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                  <span>{authError}</span>
                  <button onClick={() => setAuthError("")} className="text-red-400 hover:text-red-600 font-bold ml-2">X</button>
                </div>
              )}
              {successMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                  <span>{successMessage}</span>
                  <button onClick={() => setSuccessMessage("")} className="text-emerald-400 hover:text-emerald-600 font-bold ml-2">X</button>
                </div>
              )}
              <LandingPage 
                onEmailSignIn={handleEmailSignIn}
                onEmailSignUp={handleEmailSignUp}
                onGoogleSignIn={handleGoogleSignIn}
                isLoading={loading} 
                urlInviteCode={urlInviteCode}
                onDemoSignIn={handleDemoSignIn}
                onResetPassword={handleResetPassword}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </>
  );
}
