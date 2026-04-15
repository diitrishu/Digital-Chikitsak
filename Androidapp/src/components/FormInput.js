import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller } from 'react-hook-form';

export default function FormInput({ control, name, label, rules, placeholder, secureTextEntry, keyboardType, ...rest }) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <>
            <TextInput
              style={[styles.input, error ? styles.inputError : styles.inputNormal]}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              {...rest}
            />
            {error && <Text style={styles.errorText}>{error.message}</Text>}
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1f2937',
  },
  inputNormal: { borderColor: '#e5e7eb' },
  inputError: { borderColor: '#f87171' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
});
