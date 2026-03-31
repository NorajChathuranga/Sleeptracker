import Constants from 'expo-constants';

export function isExpoGo(): boolean {
  const ownership = (Constants as { appOwnership?: string }).appOwnership;
  const executionEnvironment = (Constants as { executionEnvironment?: string }).executionEnvironment;

  return ownership === 'expo' || executionEnvironment === 'storeClient';
}
