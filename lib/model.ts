export type View = "home" | "library" | "write" | "explore";

export type StoryPage = {
  id: string;
  body: string;
  image?: string;
  imageName?: string;
  imageFit?: "contain" | "crop" | "fullscreen";
  imagePositionX?: number;
  imagePositionY?: number;
  imagePlacementX?: number;
  imagePlacementY?: number;
  imageLocked?: boolean;
};

export type ChapterNote = {
  id: string;
  body: string;
};

export type Chapter = {
  id: string;
  title: string;
  notes: ChapterNote[];
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
  genres: string[];
  synopsis: string;
  coverColor: string;
  coverData?: string;
  coverName?: string;
  coverType?: string;
  status: "draft" | "published";
  createdAt: number;
  updatedAt: number;
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
