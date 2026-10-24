import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** Four-color Google G, with a transparent background at any display size. */
export default function GoogleLogo({size = 20}: {size?: number}) {
  return <Svg width={size} height={size} viewBox="0 0 18 18" accessible={false}>
    <Path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"/>
    <Path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <Path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.347 2.827.957 4.042l3.007-2.332z"/>
    <Path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.346l2.581-2.581C13.463.892 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </Svg>;
}
