import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AudioPlayer } from './components/ui/AudioPlayer';

export default function App() {
    return (
        <View style={styles.container}>
            <OnboardingScreen />
            <AudioPlayer sourceUrl="http://10.0.2.2:8000/audio/daily-brief?lang=en" title="Daily Brief (English)" />
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
