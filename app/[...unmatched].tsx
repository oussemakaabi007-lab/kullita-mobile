import { Redirect, useGlobalSearchParams } from 'expo-router';

export default function Unmatched() {
    const { unmatched } = useGlobalSearchParams();

    if (unmatched && unmatched.includes('notification.click')) {
        return <Redirect href="/" />;
    }

    return <Redirect href="/" />;
}