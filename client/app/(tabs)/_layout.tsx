import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, HomeIcon, Book, BookIcon, ChefHat, ChefHatIcon, User, UserIcon, Users, UsersIcon } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 100,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            focused ? <HomeIcon color="#6DA98C" size={28} /> : <Home color="#B0B0B0" size={28} />
          ),
        }}
      />

      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ focused }) =>
            focused ? <UsersIcon color="#6DA98C" size={28} /> : <Users color="#B0B0B0" size={28} />,
        }}
      />
      <Tabs.Screen
        name="chef"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 50,
                borderWidth: focused ? 3 : 0,
                borderColor: focused ? '#6DA98C' : 'transparent',
                backgroundColor: '#6DA98C',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 4,
                alignSelf: 'center',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {focused ? <ChefHatIcon color="#fff" size={32} /> : <ChefHat color="#fff" size={32} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: ({ focused }) => (
            focused ? <BookIcon color="#6DA98C" size={28} /> : <Book color="#B0B0B0" size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            focused ? <UserIcon color="#6DA98C" size={28} /> : <User color="#B0B0B0" size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
