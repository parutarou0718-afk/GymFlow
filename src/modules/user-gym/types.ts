export type MembershipStatus = 'active' | 'inactive' | 'unknown';

export interface UserGymRelationship {
  id: string;
  userId: string;
  gymId: string;
  isHome: boolean;
  isFavorite: boolean;
  lastVisitedAt?: number | null;
  membershipStatus?: MembershipStatus | null;
  membershipStartedAt?: number | null;
  membershipExpiresAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SetMembershipInput { status: MembershipStatus; startedAt?: number | null; expiresAt?: number | null; }
export interface ListUserGymsOptions { homeOnly?: boolean; favoriteOnly?: boolean; visitedOnly?: boolean; membershipStatus?: MembershipStatus; }
export interface RecentGymsOptions { limit?: number; }
