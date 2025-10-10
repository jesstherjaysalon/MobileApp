import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './screens/Login';
import TabBar from './TabBar';
import AuthLoading from './screens/AuthLoading';
import RouteDetailsScreen from './screens/RouteDetailsScreen';
import RouteProgress from './screens/RouteProgress';
import ReschedDetails from './screens/ReschedDetails';
import ReschedProgress from './screens/ReschedProgress';
import ZonePage from './screens/ZonePage';
import RouteSummaryScreen from './screens/RouteSummaryScreen';
import SplashScreen from './screens/SplashScreen';
import ForgotPassword from './screens/ForgotPassword';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
       <Stack.Navigator initialRouteName="Splash">
    <Stack.Screen
      name="Splash"
      component={SplashScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AuthLoading"
      component={AuthLoading}
      options={{ headerShown: false }}
    />
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={TabBar}
          options={{ headerShown: false }}
        />

         <Stack.Screen
          name="RouteDetailsScreen"
          component={RouteDetailsScreen}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="RouteProgress"
          component={RouteProgress}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReschedDetails"
          component={ReschedDetails}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="ReschedProgress"
          component={ReschedProgress}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Zone"
          component={ZonePage}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="RouteSummary"
          component={RouteSummaryScreen}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
