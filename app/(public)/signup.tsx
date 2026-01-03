import { Link, useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView, ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { api } from '../../services/api';
import { useKeepFullScreen } from '@/hooks/useKeepFullScreen';

export default function Signup() {
  useKeepFullScreen();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "listener"
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("all fields are required");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (/^\s/.test(form.username)) {
      setError("Username cannot start with a space");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/register", {
        email: form.email,
        name: form.username,
        password: form.password,
        role: form.role,
      });

      if (res.data.message === "wellcome") {
        router.replace('/login');
      } else {
        setError(res.data.message || "Registration failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.pageWrapper}>
      {loading && (
        <View style={styles.miniLoader}>
          <ActivityIndicator color="#0066ff" size="small" />
          <Text style={styles.loaderText}>creating account...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Create Account</Text>

          {error ? (
            <View style={styles.errorMessage}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#b3b3b3" style={styles.innerIcon} />
              <TextInput 
                style={styles.inputField} 
                placeholder="Choose a username" 
                placeholderTextColor="#777"
                onChangeText={(val) => { setForm({...form, username: val}); setError(""); }}
                value={form.username}
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#b3b3b3" style={styles.innerIcon} />
              <TextInput 
                style={styles.inputField} 
                placeholder="name@example.com" 
                placeholderTextColor="#777"
                onChangeText={(val) => { setForm({...form, email: val}); setError(""); }}
                value={form.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#b3b3b3" style={styles.innerIcon} />
              <TextInput 
                style={styles.inputField} 
                placeholder="••••••••" 
                placeholderTextColor="#777"
                secureTextEntry={!showPassword}
                onChangeText={(val) => { setForm({...form, password: val}); setError(""); }}
                value={form.password}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color="#b3b3b3" /> : <Eye size={18} color="#b3b3b3" />}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#b3b3b3" style={styles.innerIcon} />
              <TextInput 
                style={styles.inputField} 
                placeholder="••••••••" 
                placeholderTextColor="#777"
                secureTextEntry={!showConfirmPassword}
                onChangeText={(val) => { setForm({...form, confirmPassword: val}); setError(""); }}
                value={form.confirmPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} color="#b3b3b3" /> : <Eye size={18} color="#b3b3b3" />}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.roleSelection}>
            <Text style={styles.label}>Register as:</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.customRadio, form.role === 'listener' && styles.radioActive]} 
                onPress={() => setForm({...form, role: 'listener'})}
              >
                <Text style={[styles.radioText, form.role === 'listener' && styles.radioTextActive]}>Listener</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.customRadio, form.role === 'artist' && styles.radioActive]} 
                onPress={() => setForm({...form, role: 'artist'})}
              >
                <Text style={[styles.radioText, form.role === 'artist' && styles.radioTextActive]}>Artist</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSignup} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? "Creating account..." : "Sign Up"}</Text>
          </TouchableOpacity>

          <Text style={styles.divider}>or</Text>

          <Link href="/login" style={styles.formLink}>
            Already have an account? <Text style={{color: '#0066ff'}}>Login</Text>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: '#090b0f',
  },
  scrollContainer: {
    paddingTop: 30,
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    paddingHorizontal: 25,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 20,
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    padding: 12,
    borderRadius: 6,
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
    marginBottom: 20,
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
    zIndex: 1,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 45,
    paddingRight: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  eyeBtn: {
    paddingHorizontal: 15,
  },
  roleSelection: {
    marginBottom: 25,
  },
  radioGroup: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  customRadio: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  radioActive: {
    backgroundColor: '#0059df',
  },
  radioText: {
    color: '#b3b3b3',
    fontWeight: '600',
    fontSize: 14,
  },
  radioTextActive: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#0059df',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    textAlign: 'center',
    color: '#b3b3b3',
    fontSize: 13,
    marginVertical: 20,
  },
  formLink: {
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
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