export type View = "home" | "write" | "styles" | "explore";

export type StoryPage = {
  id: string;
  body: string;
  image?: string;
  imageName?: string;
};

export type Chapter = {
  id: string;
  title: string;
  notes: string;
  pages: StoryPage[];
};

export type PageStyle = {
  id: string;
  name: string;
  paper: string;
  ink: string;
  accent: string;
  margin: "classic" | "wide" | "compact";
  numberPosition: "center" | "right" | "outer";
};

export type DraftStory = {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  activeChapterId: string;
  activePageId: string;
  style: PageStyle;
  chapters: Chapter[];
};

export type Author = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  bio: string;
  followers: number;
  accent: string;
};

export type PublishedStory = {
  id: string;
  title: string;
  authorId: string;
  genre: string;
  synopsis: string;
  cover: string;
  coverAccent: string;
  likes: number;
  dislikes: number;
  rating: number;
  ratingCount: number;
  chapters: { title: string; body: string }[];
};

export type SocialState = {
  following: string[];
  liked: string[];
  disliked: string[];
  ratings: Record<string, number>;
  comments: Record<string, { id: string; author: string; body: string; when: string }[]>;
};
