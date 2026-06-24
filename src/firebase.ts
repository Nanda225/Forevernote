import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

import { 
  collection as fsCollection,
  doc as fsDoc,
  query as fsQuery,
  where as fsWhere,
  onSnapshot as fsOnSnapshot,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  serverTimestamp as fsServerTimestamp,
  writeBatch as fsWriteBatch
} from 'firebase/firestore';

const app = initializeApp(firebaseConfig);

// CRITICAL: Using initializeFirestore with experimentalForceLongPolling keeps connection extremely stable inside sandboxed/proxy iframe environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || getVirtualUser()?.uid,
      email: auth.currentUser?.email || getVirtualUser()?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to handle simple Google Login with signInWithPopup
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

/* =========================================================================
   VIRTUAL DATABASE EMULATOR / OFFLINE FALLBACK FOR UNRESTRICTED ACCESS
   ========================================================================= */

let isVirtualSessionActive = false;
let virtualUserObj: any = null;

export function setVirtualSession(active: boolean, user: any = null) {
  isVirtualSessionActive = active;
  virtualUserObj = user;
  if (active && user) {
    localStorage.setItem("fn_virtual_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("fn_virtual_user");
  }
  // Dispatch dynamic update event so listeners know the auth status has changed
  window.dispatchEvent(new CustomEvent('fn_auth_changed'));
}

export function getVirtualUser() {
  if (!virtualUserObj) {
    const saved = localStorage.getItem("fn_virtual_user");
    if (saved) {
      try {
        virtualUserObj = JSON.parse(saved);
        isVirtualSessionActive = true;
      } catch (e) {
        // ignore invalid JSON
      }
    }
  }
  return virtualUserObj;
}

// Initialize on file load
getVirtualUser();

// Robust proxy check to determine if virtual mode is active
export function isVirtualMode() {
  return isVirtualSessionActive || !auth.currentUser;
}

// 1. DOC WRAPPER
export function doc(database: any, collectionPath: string, ...pathSegments: string[]): any {
  const docId = pathSegments[0];
  const path = `${collectionPath}/${docId}`;
  
  if (isVirtualMode()) {
    return {
      isVirtual: true,
      id: docId,
      collectionPath,
      path,
      type: 'document'
    };
  }
  return fsDoc(database, collectionPath, ...pathSegments);
}

// 2. COLLECTION WRAPPER
export function collection(database: any, collectionPath: string, ...pathSegments: string[]): any {
  const path = collectionPath;
  if (isVirtualMode()) {
    return {
      isVirtual: true,
      path,
      type: 'collection'
    };
  }
  return fsCollection(database, collectionPath, ...pathSegments);
}

// 3. QUERY WRAPPER
export function query(queryRef: any, ...queryConstraints: any[]): any {
  if (queryRef?.isVirtual) {
    return {
      isVirtual: true,
      ref: queryRef,
      constraints: queryConstraints
    };
  }
  return fsQuery(queryRef, ...queryConstraints);
}

// 4. WHERE WRAPPER
export function where(fieldPath: string, opStr: any, value: any): any {
  if (isVirtualMode()) {
    return {
      isVirtual: true,
      fieldPath,
      opStr,
      value
    };
  }
  return fsWhere(fieldPath, opStr, value);
}

// 5. GET DOC WRAPPER
export async function getDoc(docRef: any): Promise<any> {
  if (docRef?.isVirtual) {
    const key = `fn_vdb_${docRef.path}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : null;
    return {
      exists: () => data !== null,
      id: docRef.id,
      ref: docRef,
      data: () => data
    };
  }
  return fsGetDoc(docRef);
}

// 6. SET DOC WRAPPER
export async function setDoc(docRef: any, data: any): Promise<any> {
  if (docRef?.isVirtual) {
    const key = `fn_vdb_${docRef.path}`;
    const cleanData = JSON.parse(JSON.stringify(data, (k, v) => {
      if (v && typeof v === 'object' && (v._methodName === 'serverTimestamp' || v.isServerTimestamp)) {
        return new Date().toISOString();
      }
      return v;
    }));
    
    localStorage.setItem(key, JSON.stringify(cleanData));
    
    const listKey = `fn_vdb_list_${docRef.collectionPath}`;
    const listRaw = localStorage.getItem(listKey);
    const list = listRaw ? JSON.parse(listRaw) : [];
    if (!list.includes(docRef.id)) {
      list.push(docRef.id);
      localStorage.setItem(listKey, JSON.stringify(list));
    }
    
    window.dispatchEvent(new CustomEvent('fn_vdb_update', { detail: { path: docRef.path } }));
    return;
  }
  return fsSetDoc(docRef, data);
}

// 7. UPDATE DOC WRAPPER
export async function updateDoc(docRef: any, data: any): Promise<any> {
  if (docRef?.isVirtual) {
    const key = `fn_vdb_${docRef.path}`;
    const raw = localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : {};
    
    const cleanData = JSON.parse(JSON.stringify(data, (k, v) => {
      if (v && typeof v === 'object' && (v._methodName === 'serverTimestamp' || v.isServerTimestamp)) {
        return new Date().toISOString();
      }
      return v;
    }));
    
    const merged = { ...existing, ...cleanData };
    localStorage.setItem(key, JSON.stringify(merged));
    
    const listKey = `fn_vdb_list_${docRef.collectionPath}`;
    const listRaw = localStorage.getItem(listKey);
    const list = listRaw ? JSON.parse(listRaw) : [];
    if (!list.includes(docRef.id)) {
      list.push(docRef.id);
      localStorage.setItem(listKey, JSON.stringify(list));
    }
    
    window.dispatchEvent(new CustomEvent('fn_vdb_update', { detail: { path: docRef.path } }));
    return;
  }
  return fsUpdateDoc(docRef, data);
}

// 8. DELETE DOC WRAPPER
export async function deleteDoc(docRef: any): Promise<any> {
  if (docRef?.isVirtual) {
    const key = `fn_vdb_${docRef.path}`;
    localStorage.removeItem(key);
    
    const listKey = `fn_vdb_list_${docRef.collectionPath}`;
    const listRaw = localStorage.getItem(listKey);
    let list = listRaw ? JSON.parse(listRaw) : [];
    list = list.filter((id: string) => id !== docRef.id);
    localStorage.setItem(listKey, JSON.stringify(list));
    
    window.dispatchEvent(new CustomEvent('fn_vdb_update', { detail: { path: docRef.path } }));
    return;
  }
  return fsDeleteDoc(docRef);
}

// 9. GET DOCS WRAPPER (COLLECTIONS & QUERIES)
export async function getDocs(queryObj: any): Promise<any> {
  if (queryObj?.isVirtual) {
    const collectionPath = queryObj.ref?.path || queryObj.path;
    const listKey = `fn_vdb_list_${collectionPath}`;
    const listRaw = localStorage.getItem(listKey);
    const list = listRaw ? JSON.parse(listRaw) : [];
    
    const docsList: any[] = [];
    for (const id of list) {
      const key = `fn_vdb_${collectionPath}/${id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        docsList.push({
          id,
          ref: { id, path: `${collectionPath}/${id}` },
          data: () => data
        });
      }
    }
    
    let filteredList = docsList;
    const constraints = queryObj.constraints || [];
    for (const constraint of constraints) {
      if (constraint && constraint.fieldPath) {
        const { fieldPath, opStr, value } = constraint;
        filteredList = filteredList.filter(d => {
          const docVal = d.data()[fieldPath];
          if (opStr === '==' || opStr === '===') {
            return docVal === value;
          }
          if (opStr === 'in') {
            return Array.isArray(value) && value.includes(docVal);
          }
          return true;
        });
      }
    }
    
    return {
      empty: filteredList.length === 0,
      docs: filteredList,
      forEach: (callback: any) => filteredList.forEach(callback)
    };
  }
  return fsGetDocs(queryObj);
}

// 10. ONSNAPSHOT WRAPPER
export function onSnapshot(queryObj: any, callback: any, errorCallback?: any): any {
  if (queryObj?.isVirtual) {
    const trigger = async () => {
      try {
        const snap = await getDocs(queryObj);
        callback(snap);
      } catch (err) {
        if (errorCallback) errorCallback(err);
      }
    };
    
    trigger();
    
    const handleUpdate = () => {
      trigger();
    };
    window.addEventListener('fn_vdb_update', handleUpdate);
    
    return () => {
      window.removeEventListener('fn_vdb_update', handleUpdate);
    };
  }
  
  const safeErrorCallback = errorCallback || ((err: any) => {
    console.warn("Recovered from secure Firestore snapshot callback error:", err);
  });
  return fsOnSnapshot(queryObj, callback, safeErrorCallback);
}

// 11. WRITE BATCH WRAPPER
export function writeBatch(database: any): any {
  if (isVirtualMode()) {
    const ops: (() => Promise<void>)[] = [];
    return {
      set: (docRef: any, data: any) => {
        ops.push(async () => {
          await setDoc(docRef, data);
        });
      },
      update: (docRef: any, data: any) => {
        ops.push(async () => {
          await updateDoc(docRef, data);
        });
      },
      delete: (docRef: any) => {
        ops.push(async () => {
          await deleteDoc(docRef);
        });
      },
      commit: async () => {
        for (const op of ops) {
          await op();
        }
      }
    };
  }
  return fsWriteBatch(database);
}

// 12. SERVER TIMESTAMP WRAPPER
export function serverTimestamp(): any {
  if (isVirtualMode()) {
    return { isServerTimestamp: true, _methodName: 'serverTimestamp' };
  }
  return fsServerTimestamp();
}
