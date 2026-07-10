import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  size?: number;
  color?: string;
}

interface TabIconProps extends IconProps {
  focused?: boolean;
}

interface ToggleIconProps extends IconProps {
  filled?: boolean;
}

function tabIcon(outline: IoniconName, filled: IoniconName) {
  return function Icon({ size = 24, color = '#FFFFFF', focused = false }: TabIconProps) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  };
}

function toggleIcon(outline: IoniconName, filled: IoniconName) {
  return function Icon({ size = 24, color = '#FFFFFF', filled: isFilled = false }: ToggleIconProps) {
    return <Ionicons name={isFilled ? filled : outline} size={size} color={color} />;
  };
}

function simpleIcon(name: IoniconName) {
  return function Icon({ size = 24, color = '#FFFFFF' }: IconProps) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

// Tab navigation icons (support focused/unfocused states)
export const HomeIcon = tabIcon('home-outline', 'home');
export const ExploreIcon = tabIcon('compass-outline', 'compass');
export const CreateIcon = tabIcon('add-circle-outline', 'add-circle');
export const NotificationsIcon = tabIcon('notifications-outline', 'notifications');
export const ProfileIcon = tabIcon('person-circle-outline', 'person-circle');
export const MatchIcon = tabIcon('git-compare-outline', 'git-compare');
export const SignalsIcon = tabIcon('pulse-outline', 'pulse');
export const MyWorldIcon = tabIcon('planet-outline', 'planet');

// Action icons (support filled/outline toggle)
export const LikeIcon = toggleIcon('heart-outline', 'heart');
export const SaveIcon = toggleIcon('bookmark-outline', 'bookmark');

// Simple icons
export const CommentIcon = simpleIcon('chatbubble-outline');
export const ShareIcon = simpleIcon('share-social-outline');
export const SearchIcon = simpleIcon('search-outline');
export const BackIcon = simpleIcon('arrow-back');
export const CloseIcon = simpleIcon('close');
export const SettingsIcon = simpleIcon('settings-outline');
export const EditIcon = simpleIcon('pencil-outline');
export const DeleteIcon = simpleIcon('trash-outline');
export const SendIcon = simpleIcon('arrow-up');

// Dream theme icons
export const MoonIcon = simpleIcon('moon-outline');
export const DreamIcon = simpleIcon('cloud-outline');
export const LucidIcon = simpleIcon('sparkles-outline');
export const NightmareIcon = simpleIcon('thunderstorm-outline');
export const NormalIcon = simpleIcon('cloud-outline');

// Privacy icons
export const PrivateIcon = simpleIcon('lock-closed-outline');
export const FollowersIcon = simpleIcon('people-outline');
export const PublicIcon = simpleIcon('globe-outline');

// Status icons
export const SuccessIcon = simpleIcon('checkmark-circle-outline');
export const WarningIcon = simpleIcon('warning-outline');
export const InfoIcon = simpleIcon('information-circle-outline');
