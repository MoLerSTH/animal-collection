import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ShareTemplateScreen from '../ShareTemplateScreen';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function renderScreen(animalId = 'a1') {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  } as any;
  const route = {
    key: 'ShareTemplate',
    name: 'ShareTemplate',
    params: { animalId },
  } as any;

  render(<ShareTemplateScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('ShareTemplateScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders header and animal card', () => {
    renderScreen('a1');
    expect(screen.getByText('Share Template')).toBeTruthy();
    expect(screen.getByText('Hippopotamus')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { navigation } = renderScreen('a1');
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('triggers alert when share target is tapped', () => {
    renderScreen('a1');
    fireEvent.press(screen.getByText('Share to Instagram Story'));
    expect(Alert.alert).toHaveBeenCalledWith('Share', 'Sharing to instagram is not yet wired up.');
  });

  it('updates label to Added to Gallery when tapped', () => {
    renderScreen('a1');
    const addButton = screen.getByText('Add to Gallery');
    fireEvent.press(addButton);
    expect(screen.getByText('Added to Gallery ✓')).toBeTruthy();
  });

  it('navigates to AnimalDetail when Edit button is pressed', () => {
    const { navigation } = renderScreen('a1');
    fireEvent.press(screen.getByText('Edit'));
    expect(navigation.navigate).toHaveBeenCalledWith('AnimalDetail', {
      animalId: 'a1',
      imageUri: 'https://static.bangkokpost.com/media/content/20240913/c1_2865088.jpg',
    });
  });
});
