import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator, Platform, SafeAreaView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { api } from '../../services/api';
import { useKeepFullScreen } from '@/hooks/useKeepFullScreen';

export default function ForgotPassword() {
  useKeepFullScreen();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/forgot-password", { email });
      
      setMessage("If an account exists with this email, a reset link has been sent.");
    } catch (err: any) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.pageWrapper}>
      {loading && (
        <View style={styles.miniLoader}>
          <ActivityIndicator color="#0066ff" size="small" />
          <Text style={styles.loaderText}>sending email...</Text>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
        </View>

        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a link to get back into your account.
        </Text>

        {message ? (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorMessage}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color="#b3b3b3" style={styles.innerIcon} />
            <TextInput 
              style={styles.inputField} 
              placeholder="name@example.com" 
              placeholderTextColor="#777"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                setError("");
                setMessage("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Send size={18} color="#ffffff" style={{ marginRight: 10 }} />
          <Text style={styles.submitBtnText}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: '#090b0f',
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'android' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  backBtn: {
    padding: 5,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#b3b3b3',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
  },
  successMessage: {
    backgroundColor: 'rgba(0, 255, 100, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 100, 0.2)',
    marginBottom: 20,
  },
  successText: {
    color: '#00ff64',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.2)',
    marginBottom: 20,
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 30,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  innerIcon: {
    position: 'absolute',
    left: 15,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 45,
    color: '#ffffff',
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: '#0059df',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  miniLoader: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 99,
    zIndex: 1000,
  },
  loaderText: {
    color: '#0066ff',
    marginLeft: 10,
    fontWeight: '600',
  }
});