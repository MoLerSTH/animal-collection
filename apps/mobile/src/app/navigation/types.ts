import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AnimalType, HabitatTag } from '../../features/collections/types';

export type MainTabParamList = {
  Gallery: undefined;
  Catch: undefined;
  User: undefined;
};

export type RootStackParamList = {
  Onboarding: { review?: boolean } | undefined;
  Login: undefined;
  Settings: undefined;
  Privacy: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AnimalDetail: {
    // Present when editing a freshly-caught animal (has a photo but no saved record yet)
    imageUri?: string;
    identifiedSpecies?: string;
    identifiedStory?: string;
    animalType?: AnimalType;
    habitatTags?: HabitatTag[];
    capturedAt?: string;
    // Present when opening an already-saved animal from the gallery
    animalId?: string;
  };
  ShareTemplate: {
    animalId: string;
  };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
