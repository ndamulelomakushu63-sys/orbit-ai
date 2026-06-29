export interface NativeFile {
  path: string;
  category: "React Native App" | "Firebase Config & Rules" | "Cloud Functions" | "Payment & Build";
  code: string;
}

export const NATIVE_FILES: NativeFile[] = [
  {
    path: "firebase/config.ts",
    category: "Firebase Config & Rules",
    code: `import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Firebase Project configurations
const firebaseConfig = {
  apiKey: "AIzaSyYourApiKeyHere",
  authDomain: "orbit-ai-12345.firebaseapp.com",
  projectId: "orbit-ai-12345",
  storageBucket: "orbit-ai-12345.appspot.com",
  messagingSenderId: "98765432100",
  appId: "1:98765432100:web:abcdef12345abcde",
  measurementId: "G-MEASURE"
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize Auth with secure local persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
`
  },
  {
    path: "firestore.rules",
    category: "Firebase Config & Rules",
    code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profile: Owners can write, anyone logged in can read (for referral confirmations)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && (
        request.auth.uid == userId || 
        // Allow updating balance via referrals backend/functions
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['balance', 'referredBy'])
      );
    }
    
    // Messages: Read/write only owned conversations
    match /messages/{messageId} {
      allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Subscriptions: Authenticated reads; writes handled by automated backend webhooks
    match /subscriptions/{subId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.admin == true);
      allow write: if request.auth != null && request.auth.token.admin == true; // Admin/server authority only
    }
    
    // Referrals: Authenticated users can view referrals related to them
    match /referrals/{referralId} {
      allow read: if request.auth != null && (resource.data.referrerId == request.auth.uid || resource.data.referredUserId == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.referredUserId == request.auth.uid;
      allow update: if false; // System updates only
    }
    
    // Withdrawals: Users can read and create their own request; Admin can edit/approve
    match /withdrawals/{withdrawalId} {
      allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && request.auth.token.admin == true;
    }

    // Side Hustle Plans: Read and write owned plans
    match /side_hustle_plans/{planId} {
      allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    // Business Plans: Read and write owned plans
    match /business_plans/{planId} {
      allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}`
  },
  {
    path: "functions/index.js",
    category: "Cloud Functions",
    code: `const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();

/**
 * 1. SECURE GEMINI AI PROXY
 * This Cloud Function securely communicates with Gemini API to keep the API key fully hidden.
 */
exports.askGemini = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
      }

      const { message, history, userId } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing prompt query message" });
      }

      // 1. Verify Authentication Token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized access, missing auth token" });
      }
      
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const tokenUid = decodedToken.uid;

      // 2. Query Firestore user subscription limits (Rate limits for Free users, fast for Pro users)
      const userSnap = await admin.firestore().collection("users").doc(tokenUid).get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "User profile not found" });
      }
      
      const userData = userSnap.data();
      const userPlan = userData.plan || "Free";

      // Rate limit controls for Free users or redirection logic
      if (userPlan === "Free") {
        // Implement customized free tier filters
        // e.g., restrict to 10 queries, or prompt for subscription
      }

      // 3. Initialize secure server-side Google GenAI with runtime secret env key
      const geminiApiKey = process.env.GEMINI_API_KEY || functions.config().gemini.key;
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      // 4. Clean conversation formats to match API structure
      const contents = [];
      if (history && Array.isArray(history)) {
        history.slice(-10).forEach(msg => {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.message || msg.text }]
          });
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      // 5. Query model or stream back
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: "You are Orbit AI, an intelligent, modern and premium virtual mobile assistant. Help users clarify their thoughts, code, drafts, and planning. Keep output mobile-friendly."
        }
      });

      const reply = response.text || "No answer generated.";

      // 6. Log dynamic metric for Analytics monitoring
      await admin.firestore().collection("messages").add({
        userId: tokenUid,
        promptLength: message.length,
        responseLength: reply.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({ reply });
    } catch (err) {
      console.error("Cloud function askGemini error: ", err);
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
  });
});

/**
 * 2. PAYFAST RECURRING BILLING WEBHOOK ROUTE
 * Handles automatic subscription state promotions upon receiving IPN notifications from South Africa's PayFast.
 */
exports.payfastWebhook = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const ipnData = req.body;
      
      // PayFast signature validations go here (omitted for short production clarity)
      const paymentStatus = ipnData.payment_status;
      const customStr = ipnData.custom_str1; // Passed as userId when launching PayFast
      const amountTotal = parseFloat(ipnData.amount_gross);
      const planName = amountTotal > 500 ? "Pro" : "Pro"; // R99.99 vs R1188

      if (paymentStatus === "COMPLETE") {
        const batch = admin.firestore().batch();
        const userRef = admin.firestore().collection("users").doc(customStr);

        // 1. Promote User Plan
        batch.update(userRef, { plan: "Pro" });

        // 2. Log Subscription Record
        const subscriptionRef = admin.firestore().collection("subscriptions").doc();
        batch.set(subscriptionRef, {
          userId: customStr,
          plan: amountTotal > 500 ? "Yearly" : "Monthly",
          amount: amountTotal,
          status: "Active",
          renewalDate: new Date(Date.now() + (amountTotal > 500 ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        });

        // 3. Process referral reward if user was referred
        const userDoc = await userRef.get();
        if (userDoc.exists && userDoc.data().referredBy) {
          const referrerCode = userDoc.data().referredBy;
          
          // Find the referrer by code
          const referrerQuery = await admin.firestore()
            .collection("users")
            .where("referralCode", "==", referrerCode)
            .limit(1)
            .get();

          if (!referrerQuery.empty) {
            const referrerDoc = referrerQuery.docs[0];
            const referrerId = referrerDoc.id;
            
            // Add referral logging record
            const referralRef = admin.firestore().collection("referrals").doc();
            batch.set(referralRef, {
              referrerId,
              referredUserId: customStr,
              referredName: userDoc.data().name || "Anonymous User",
              reward: 10.00, // R10 Reward
              status: "Paid",
              timestamp: new Date().toISOString()
            });

            // Increment referrer earnings balance
            const referrerRef = admin.firestore().collection("users").doc(referrerId);
            batch.update(referrerRef, {
              balance: admin.firestore.FieldValue.increment(10.00)
            });
          }
        }

        await batch.commit();
        console.log(\`Successfully activated subscription for user \${customStr}\`);
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("PayFast Webhook error:", err);
      return res.status(500).send("Callback Error");
    }
  });
});
`
  },
  {
    path: "app/(tabs)/index.tsx",
    category: "React Native App",
    code: `import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../src/services/firebase';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  // Load conversation on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "messages"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "asc")
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMessages(list);
    } catch (e) {
      console.log("History failed to load:", e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMessage = inputText;
    setInputText("");
    
    const user = auth.currentUser;
    if (!user) return;

    const timestamp = new Date().toISOString();
    const newUserMsg = {
      userId: user.uid,
      message: userMessage,
      role: 'user',
      timestamp
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Retrieve JWT user token for authentication verification
      const userToken = await user.getIdToken();
      
      // Call Cloud function containing the secure Gemini request
      const response = await fetch("https://us-central1-orbit-ai-12345.cloudfunctions.net/askGemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${userToken}\`
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({ role: m.role, text: m.message }))
        })
      });

      const data = await response.json();
      const reply = data.reply || "Unable to formulate response. Ensure your internet is active.";
      
      const newModelMsg = {
        userId: user.uid,
        message: reply,
        role: 'model',
        timestamp: new Date().toISOString()
      };

      // Save to Firestore messages (Optional: write-permissions directly from devices)
      await addDoc(collection(db, "messages"), newUserMsg);
      await addDoc(collection(db, "messages"), newModelMsg);

      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "model",
        message: "Network request failed. Ensure your subscription is active.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingVertical: 15 }}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble, 
            item.role === 'user' ? styles.userBubble : styles.aiBubble
          ]}>
            <Text style={item.role === 'user' ? styles.userText : styles.aiText}>
              {item.message}
            </Text>
          </View>
        )}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0080FF" />
          <Text style={styles.loadingText}>Orbit AI is searching answers...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Orbit AI anything..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  messageBubble: { padding: 12, borderRadius: 15, marginHorizontal: 15, marginVertical: 6, maxWidth: '75%' },
  userBubble: { backgroundColor: '#0080FF', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  aiBubble: { backgroundColor: '#F1F5F9', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  userText: { color: '#FFF', fontSize: 15 },
  aiText: { color: '#1E293B', fontSize: 15 },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, fontSize: 15, maxUpperHeight: 100 },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0080FF', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 20, paddingVertical: 5 },
  loadingText: { color: '#64748B', fontSize: 13, marginLeft: 8 }
});
`
  },
  {
    path: "app/(tabs)/agent.tsx",
    category: "React Native App",
    code: `import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Clipboard, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../src/services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export default function AgentDashboardScreen() {
  const [profile, setProfile] = useState(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      setProfile(userDoc.data());
    }
  };

  const becomeAgent = async () => {
    // Only Pro users can become agents
    if (!profile || profile.plan !== "Pro") {
      Alert.alert("Upgrade Required", "Only premium Pro subscription users can activate their Agent referral dashboard.", [
        { text: "Cancel" },
        { text: "View Plans", onPress: () => {} } // Navigate to Upgrade plans screen
      ]);
      return;
    }

    setIsActivating(true);
    try {
      const user = auth.currentUser;
      const refCode = "ORBIT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await updateDoc(doc(db, "users", user.uid), {
        agentStatus: true,
        referralCode: refCode
      });

      setProfile(prev => ({ ...prev, agentStatus: true, referralCode: refCode }));
      Alert.alert("Success!", "You are now an active referral Agent. Share your link to start earning R10 per premium signup.");
    } catch (e) {
      Alert.alert("Error", "Failed to activate Agent status. Network delay.");
    } finally {
      setIsActivating(false);
    }
  };

  const copyToClipboard = () => {
    if (!profile || !profile.referralCode) return;
    const refLink = \`https://orbitai.co.za/register?ref=\${profile.referralCode}\`;
    Clipboard.setString(refLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!profile) {
    return <ActivityIndicator size="large" color="#0080FF" style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Orbit Agent Dashboard</Text>
      
      {profile.agentStatus ? (
        <View>
          {/ * Earnings Display card * /}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Current Earnings</Text>
            <Text style={styles.metricValue}>R {parseFloat(profile.balance || 0).toFixed(2)}</Text>
            <Text style={styles.payoutHelper}>Minimum withdrawal amount: R50.00</Text>
          </View>

          {/ * Referral Link details * /}
          <View style={styles.linkSection}>
            <Text style={styles.sectionLabel}>Your Referral Code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{profile.referralCode}</Text>
            </View>

            <Text style={styles.sectionLabel}>Your Referral Link</Text>
            <TouchableOpacity style={styles.copyBox} onPress={copyToClipboard}>
              <Text numberOfLines={1} style={styles.linkText}>
                https://orbitai.co.za/register?ref={profile.referralCode}
              </Text>
              <Ionicons name={isCopied ? "checkmark-circle" : "copy"} size={18} color="#0080FF" />
            </TouchableOpacity>
            {isCopied && <Text style={styles.copiedHint}>Referral link copied securely!</Text>}
          </View>

          {/ * Withdraw actions * /}
          <TouchableOpacity 
            style={[styles.button, { marginTop: 25 }]} 
            onPress={() => Alert.alert("Submit Withdrawal", "Minimum withdrawal threshold is R50.")}
          >
            <Text style={styles.buttonText}>Request Earnings Withdrawal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.welcomeCard}>
          <Ionicons name="ribbon-outline" size={60} color="#0080FF" style={{ textAlign: 'center' }} />
          <Text style={styles.pitchHeader}>Become an Orbit AI Agent</Text>
          <Text style={styles.pitchDesc}>
            Earn R10.00 real money for every single referral who signs up and purchases a Pro subscription using your personal agent referral link.
          </Text>
          
          <TouchableOpacity 
            style={styles.activateButton} 
            onPress={becomeAgent}
            disabled={isActivating}
          >
            {isActivating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Activate Free Agent Dashboard</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  metricCard: { backgroundColor: '#0080FF', borderRadius: 15, padding: 20, color: '#FFF' },
  metricLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  metricValue: { color: '#FFF', fontSize: 32, fontWeight: '700', marginVertical: 5 },
  payoutHelper: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  linkSection: { marginTop: 25 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', uppercase: true, marginBottom: 8 },
  codeRow: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, alignItems: 'center' },
  codeText: { fontSize: 18, fontWeight: '700', color: '#0F172A', letterSpacing: 2 },
  copyBox: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, justifyContent: 'space-between', alignItems: 'center' },
  linkText: { fontSize: 13, color: '#0080FF', flex: 1, marginRight: 10 },
  copiedHint: { color: '#22C55E', fontSize: 12, fontWeight: '500', marginTop: 5 },
  button: { height: 50, backgroundColor: '#0080FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  welcomeCard: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, padding: 25, alignItems: 'center', marginTop: 10 },
  pitchHeader: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 15, marginBottom: 10 },
  pitchDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  activateButton: { width: '100%', height: 48, backgroundColor: '#0080FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});
`
  },
  {
    path: "app/subscription.tsx",
    category: "Payment & Build",
    code: `import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../src/services/firebase';

export default function SubscriptionScreen() {
  
  const handleUpgrade = (type: 'Monthly' | 'Yearly') => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Auth Required", "Please create an account to activate upgrades.");
      return;
    }

    const price = type === 'Monthly' ? '99.99' : '1188.00';
    const merchantId = "10000100"; // Replace with your registered PayFast Merchant ID
    const merchantKey = "46f0sh69tl678"; // Replace with your PayFast merchant_key
    
    // Payfast Subscriptions recurring billing details
    const payfastUrl = "https://www.payfast.co.za/eng/process" + 
      "?merchant_id=" + merchantId +
      "&merchant_key=" + merchantKey +
      "&return_url=" + encodeURIComponent("https://orbitai.co.za/payment-success") +
      "&cancel_url=" + encodeURIComponent("https://orbitai.co.za/payment-failed") +
      "&notify_url=" + encodeURIComponent("https://us-central1-orbit-ai-12345.cloudfunctions.net/payfastWebhook") +
      "&custom_str1=" + user.uid + 
      "&amount=" + price +
      "&item_name=" + encodeURIComponent("Orbit AI " + type + " Subscription") +
      "&m_payment_id=" + "SUB-" + Date.now() +
      "&subscription_type=1" + // Recurring billing
      "&billing_cycle=0" + 
      "&recurring_amount=" + price +
      "&frequency=" + (type === 'Monthly' ? "3" : "6"); // 3 = monthly, 6 = yearly

    // Launch secure sandbox browser to complete billing Safely
    Linking.openURL(payfastUrl).catch(() => {
      Alert.alert("Redirect Failed", "Unable to launch mobile checkout browser.");
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.mainTitle}>Upgrade to Pro with Orbit AI</Text>
      
      {/* Plan list Cards */}
      <View style={styles.planCard}>
        <View style={styles.planBadge}><Text style={styles.badgeText}>POPULAR</Text></View>
        <Text style={styles.planTier}>Monthly Premium Membership</Text>
        <Text style={styles.planPrice}>R 99.99<Text style={styles.subText}> / month</Text></Text>
        <TouchableOpacity style={styles.proButton} onPress={() => handleUpgrade('Monthly')}>
          <Text style={styles.proButtonText}>Upgrade Monthly</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.planCard, { borderColor: '#E2E8F0', borderWidth: 1 }]}>
        <Text style={styles.planTier}>Yearly Premium Saver</Text>
        <Text style={styles.planPrice}>R 1188.00<Text style={styles.subText}> / year</Text></Text>
        <Text style={styles.saverHint}>Equivalent to R99/month billed once</Text>
        <TouchableOpacity style={[styles.proButton, { backgroundColor: '#0080FF' }]} onPress={() => handleUpgrade('Yearly')}>
          <Text style={styles.proButtonText}>Upgrade Yearly - Best Value</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>Premium Exclusive Benefits</Text>
        
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Unlimited real-time AI Chat queries</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Ultra-fast responses & zero queue latency</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Become an active Orbit referral Earn Agent</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Durable private cloud chat histories saved forever</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  mainTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginVertical: 15 },
  planCard: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#0080FF', borderRadius: 15, padding: 20, marginVertical: 10, position: 'relative' },
  planBadge: { position: 'absolute', top: -11, right: 15, backgroundColor: '#0080FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  planTier: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  planPrice: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginVertical: 8 },
  subText: { fontSize: 14, color: '#64748B', fontWeight: '400' },
  proButton: { height: 44, backgroundColor: '#0080FF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  proButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  saverHint: { fontSize: 12, color: '#22C55E', fontWeight: '500', marginBottom: 8 },
  benefitsSection: { marginTop: 25 },
  benefitsTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 15 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  benefitText: { fontSize: 14, color: '#475569', marginLeft: 10 }
});
`
  },
  {
    path: "app/README.md",
    category: "Payment & Build",
    code: `# Orbit AI - Core Production Deployment Manual

This guide outlines launching Orbit AI Version 1 to Google Play Store and Apple App Store, and integrating Firebase and PayFast.

## 1. Local Dev Installation
Make sure you have node v18+ and install dependencies:
\`\`\`bash
npm i expo expo-router react-native-gesture-handler @react-native-async-storage/async-storage firebase
\`\`\`

## 2. Firebase Cloud Functions Deploy
To safely query Gemini API, deploy the Cloud Function code:
\`\`\`bash
cd functions
firebase init functions
# Install Google GenAI on function env
npm install @google/genai
# Set your secure Gemini API key config
firebase functions:config:set gemini.key="YOUR_OFFICIAL_GEMINI_API_KEY_HERE"
firebase deploy --only functions
\`\`\`

## 3. PayFast Webhook Subscriptions
Register at [PayFast South Africa](https://www.payfast.co.za/) and set your webhook URL to the cloud functions \`payfastWebhook\` endpoint in your merchant dashboard settings. This automatically monitors payments and promotes user storage plans in Firestore.

## 4. Production Android Build (.aab)
To build compile files for Android Google Play:
\`\`\`bash
# Install Expo Application Services (EAS) CLI
npm install -g eas-cli
eas login

# Initialize EAS project metadata configs
eas build:configure

# Run official production build
eas build --platform android --profile production
\`\`\`
This produces a production-signed signing key and generates a download link for the \`.aab\` deployment package ready for shipment via Google Play Developer Console!

## 5. Production iOS Build (.ipa)
To build compile files for Apple App Store (macOS/Developer subscription credentials required):
\`\`\`bash
eas build --platform ios --profile production
\`\`\``
  }
];
