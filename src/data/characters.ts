export interface Character {
  id: string;
  displayName: string;
  avatarUrl: string;
}

export const characters: Character[] = [
  {
    id: 'boy',
    displayName: 'Boy',
    avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/character-boy.png',
  },
  {
    id: 'girl',
    displayName: 'Girl',
    avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/character-girl.png',
  },
];

export const getCharacterById = (id: string): Character | undefined =>
  characters.find((c) => c.id === id);

export default characters;
