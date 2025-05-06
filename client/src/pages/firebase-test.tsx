import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { auth, db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function FirebaseTest() {
  const [user, loading] = useAuthState(auth);
  const [serverResult, setServerResult] = useState<any>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clientResult, setClientResult] = useState<any>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [adminResult, setAdminResult] = useState<any>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  async function testServerAccess() {
    try {
      setServerError(null);
      setServerResult(null);
      
      console.log('Testing server access to Firebase...');
      const response = await fetch('/api/test-firebase');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server test failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Server test result:', result);
      setServerResult(result);
    } catch (error) {
      console.error('Server test error:', error);
      setServerError(error instanceof Error ? error.message : String(error));
    }
  }

  async function testClientAccess() {
    try {
      setClientError(null);
      setClientResult(null);
      
      if (!user) {
        throw new Error('Niet ingelogd. Je moet ingelogd zijn om deze test uit te voeren.');
      }
      
      console.log('Testing client access to Firebase...');
      
      // Debug info tonen
      console.log('Firebase config:', {
        db: db,
        auth: auth,
        app: auth.app,
        currentUser: user
      });
      
      const timestamp = new Date().toISOString();
      const testData = { 
        test: true, 
        timestamp, 
        uid: user.uid,
        email: user.email 
      };
      
      // Test pad dat werkt met open Firebase regels
      const testPath = `client-tests/${user.uid}`;
      console.log(`Schrijven naar Firebase pad: ${testPath}`);
      
      try {
        // Schrijf naar de database
        const testRef = ref(db, testPath);
        await set(testRef, testData);
        console.log('Data succesvol geschreven naar Firebase');
        
        // Lees terug van de database
        const snapshot = await get(testRef);
        const result = snapshot.val();
        console.log('Data succesvol gelezen van Firebase:', result);
        
        setClientResult({
          wrote: testData,
          read: result,
          success: true,
        });
      } catch (writeError: any) {
        console.error('Firebase schrijf/lees error:', writeError);
        
        // Als direct schrijven niet lukt, probeer de REST API te gebruiken
        try {
          console.log('Proberen via REST API...');
          // Zorg ervoor dat we de Firebase database URL direct gebruiken van de configuratie in lib/firebase.ts
          const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || 
                            `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mefenmembers'}-default-rtdb.europe-west1.firebasedatabase.app`;
          
          console.log('Database URL voor REST API:', databaseURL);
          const response = await fetch(`${databaseURL}/${testPath}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Firebase REST API error: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('REST API resultaat:', result);
          
          setClientResult({
            wrote: testData,
            read: result,
            success: true,
            note: 'Gebruikt REST API als fallback'
          });
        } catch (restError: any) {
          console.error('REST API error:', restError);
          throw new Error(`Firebase schrijven mislukt: ${(writeError as Error).message || 'onbekende fout'}. REST API fallback mislukt: ${restError.message || 'onbekende fout'}`);
        }
      }
    } catch (error) {
      console.error('Client test error:', error);
      setClientError(error instanceof Error ? error.message : String(error));
    }
  }

  async function testAdminEndpoint() {
    try {
      setAdminError(null);
      setAdminResult(null);
      
      console.log('Testing admin endpoint...');
      
      const response = await fetch('/api/members');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Admin endpoint test failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Admin endpoint result:', result);
      setAdminResult(result);
    } catch (error) {
      console.error('Admin endpoint error:', error);
      setAdminError(error instanceof Error ? error.message : String(error));
    }
  }

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Firebase Test Pagina</h1>
      
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h2 className="font-semibold text-yellow-800">Authenticatie Status</h2>
        {user ? (
          <div className="mt-2">
            <p className="text-green-600 font-medium">✓ Ingelogd als {user.email}</p>
            <p className="text-sm text-gray-600 mt-1">User ID: {user.uid}</p>
          </div>
        ) : (
          <p className="text-red-500 mt-2">✗ Niet ingelogd</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Server Firebase Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testServerAccess} className="w-full mb-4">
              Test Server Firebase Access
            </Button>
            
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm mb-4">
                <p className="font-semibold">Error:</p>
                <p>{serverError}</p>
              </div>
            )}
            
            {serverResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                <p className="font-semibold text-green-800">
                  {serverResult.success ? '✓ Server test succesvol' : '✗ Server test mislukt'}
                </p>
                <Separator className="my-2" />
                <pre className="text-xs overflow-auto p-2 bg-white rounded border mt-2">
                  {JSON.stringify(serverResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Client Firebase Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testClientAccess} className="w-full mb-4" disabled={!user}>
              Test Client Firebase Access
            </Button>
            
            {!user && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm mb-4">
                Je moet ingelogd zijn om deze test uit te voeren.
              </div>
            )}
            
            {clientError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm mb-4">
                <p className="font-semibold">Error:</p>
                <p>{clientError}</p>
              </div>
            )}
            
            {clientResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                <p className="font-semibold text-green-800">
                  {clientResult.success ? '✓ Client test succesvol' : '✗ Client test mislukt'}
                </p>
                <Separator className="my-2" />
                <pre className="text-xs overflow-auto p-2 bg-white rounded border mt-2">
                  {JSON.stringify(clientResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Admin Endpoint Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testAdminEndpoint} className="w-full mb-4">
            Test Admin Endpoint (/api/members)
          </Button>
          
          {adminError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm mb-4">
              <p className="font-semibold">Error:</p>
              <p>{adminError}</p>
            </div>
          )}
          
          {adminResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
              <p className="font-semibold text-green-800">
                ✓ Admin endpoint succesvol aangeroepen
              </p>
              <Separator className="my-2" />
              <div className="max-h-60 overflow-auto">
                <pre className="text-xs overflow-auto p-2 bg-white rounded border mt-2">
                  {JSON.stringify(adminResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}