import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

type State = { error: Error | null };

/** Surfaces runtime crashes as on-screen text so testers can paste them. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={s.wrap}>
          <Text style={s.h}>App crashed</Text>
          <Text selectable>{String(this.state.error.message)}</Text>
          <Text selectable style={s.stack}>{String(this.state.error.stack ?? '')}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  wrap: { padding: 20 },
  h: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  stack: { marginTop: 8, fontSize: 12 },
});
