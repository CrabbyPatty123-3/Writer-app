import type { Author, DraftStory, PageStyle, PublishedStory, SocialState } from "./model";

export const pageStyles: PageStyle[] = [
  {
    id: "heirloom",
    name: "Heirloom",
    paper: "#fffdf7",
    ink: "#1f2924",
    accent: "#b67b16",
    margin: "classic",
    numberPosition: "center",
  },
  {
    id: "sage",
    name: "Sage Study",
    paper: "#f6f8f1",
    ink: "#193329",
    accent: "#5d806e",
    margin: "wide",
    numberPosition: "right",
  },
  {
    id: "rose",
    name: "Pressed Rose",
    paper: "#fff8f6",
    ink: "#3a282a",
    accent: "#a35d63",
    margin: "classic",
    numberPosition: "outer",
  },
  {
    id: "ink",
    name: "Clean Ink",
    paper: "#ffffff",
    ink: "#161917",
    accent: "#235d4b",
    margin: "compact",
    numberPosition: "right",
  },
];

export const initialDraft: DraftStory = {
  id: "lighthouse-keeper",
  title: "The Lighthouse Keeper",
  genre: "Supernatural",
  synopsis: "A keeper on a remote island discovers that the light is calling something home.",
  activeChapterId: "chapter-2",
  activePageId: "page-2-1",
  style: pageStyles[0],
  chapters: [
    {
      id: "chapter-1",
      title: "The Last Quiet Morning",
      notes: "- Elias has kept the light for eleven years\n  - He never speaks about his father\n- Introduce the brass key",
      pages: [
        {
          id: "page-1-1",
          body: "Every morning, Elias lit the lamp at the top of the cliff. The sea was his companion, steady and silent, and the gulls knew better than to disturb him before tea.\n\nOn the first day of winter, he found a second set of footprints circling the lighthouse.",
        },
        {
          id: "page-1-2",
          body: "They began at the waterline and ended at his locked door. Elias followed them twice, then returned to the kitchen and placed the old brass key beside his cup.",
        },
      ],
    },
    {
      id: "chapter-2",
      title: "A Light Beneath the Water",
      notes: "- The green light appears at low tide\n  - It should mirror the lighthouse beam\n- Mara arrives before the storm",
      pages: [{ id: "page-2-1", body: "" }],
    },
    {
      id: "chapter-3",
      title: "The Visitor",
      notes: "",
      pages: [{ id: "page-3-1", body: "" }],
    },
    {
      id: "chapter-4",
      title: "What the Tide Returns",
      notes: "",
      pages: [{ id: "page-4-1", body: "" }],
    },
  ],
};

export const authors: Author[] = [
  {
    id: "a1",
    name: "Elena Marlowe",
    handle: "@elenawrites",
    initials: "EM",
    bio: "Writes quiet fantasy about strange coastlines, old promises, and people finding their way home.",
    followers: 12840,
    accent: "#315f50",
  },
  {
    id: "a2",
    name: "Noah Vale",
    handle: "@noahvale",
    initials: "NV",
    bio: "Thriller writer, night-train enthusiast, and collector of overheard conversations.",
    followers: 8260,
    accent: "#7b4d3b",
  },
  {
    id: "a3",
    name: "Amara Reyes",
    handle: "@amarareads",
    initials: "AR",
    bio: "Romance with sharp dialogue, soft endings, and cities that feel like characters.",
    followers: 21300,
    accent: "#945b67",
  },
];

export const publishedStories: PublishedStory[] = [
  {
    id: "s1",
    title: "Where the Map Ends",
    authorId: "a1",
    genre: "Fantasy",
    synopsis: "A cartographer discovers a town that disappears whenever its name is written down.",
    cover: "linear-gradient(145deg, #183b32 0%, #456f5f 54%, #d3a84c 100%)",
    coverAccent: "#d9b35c",
    likes: 2840,
    dislikes: 41,
    rating: 4.7,
    ratingCount: 632,
    chapters: [
      {
        title: "The Unmarked Road",
        body: "The road was not on any of Lena's maps, which was impossible, because Lena had drawn every road from the capital to the sea. Still, it waited beyond the orchard: narrow, silver with rain, and pointing north.",
      },
      {
        title: "A Town Without a Name",
        body: "At dusk, windows appeared between the trees. Nobody in the first house would tell her where she was. They only asked whether she had brought a pen.",
      },
    ],
  },
  {
    id: "s2",
    title: "The Midnight Platform",
    authorId: "a2",
    genre: "Mystery",
    synopsis: "The last train arrives at a platform that should have been demolished twenty years ago.",
    cover: "linear-gradient(150deg, #191d25 0%, #394456 58%, #b87343 100%)",
    coverAccent: "#d69b68",
    likes: 1926,
    dislikes: 28,
    rating: 4.4,
    ratingCount: 419,
    chapters: [
      {
        title: "11:57",
        body: "Jonah heard the announcement three minutes before midnight. Platform nine, said the voice, though the station had only eight. Around him, nobody looked up.",
      },
      {
        title: "The Passenger List",
        body: "His own name was printed last. Beside it, in careful blue ink, someone had written: Do not let him leave at the final stop.",
      },
    ],
  },
  {
    id: "s3",
    title: "One Summer, Again",
    authorId: "a3",
    genre: "Romance",
    synopsis: "Two former best friends inherit opposite halves of the same seaside bookshop.",
    cover: "linear-gradient(145deg, #f6d7ce 0%, #c47a78 56%, #6e3946 100%)",
    coverAccent: "#fff2d6",
    likes: 4160,
    dislikes: 63,
    rating: 4.8,
    ratingCount: 1180,
    chapters: [
      {
        title: "Terms and Conditions",
        body: "The will gave June the sunny half of the shop and Theo the half with the leaking ceiling. It did not specify who owned the bell above the front door, so they argued about that first.",
      },
      {
        title: "The Book in the Window",
        body: "By closing time, they had sold nothing and remembered everything. Theo found their old summer reading list tucked behind the register.",
      },
    ],
  },
  {
    id: "s4",
    title: "Ashes of Saint Aurelia",
    authorId: "a1",
    genre: "Supernatural",
    synopsis: "Every candle in the mountain city goes dark when its forgotten saint wakes beneath the cathedral.",
    cover: "linear-gradient(145deg, #473421 0%, #8a5e32 50%, #d6b86b 100%)",
    coverAccent: "#f7deb0",
    likes: 3581,
    dislikes: 52,
    rating: 4.6,
    ratingCount: 744,
    chapters: [
      {
        title: "The Bell Without a Rope",
        body: "At noon, the cathedral bell rang on its own. A moment later, every flame in Saint Aurelia bent toward the mountain and went out.",
      },
    ],
  },
];

export const initialSocial: SocialState = {
  following: ["a3"],
  liked: ["s3"],
  disliked: [],
  ratings: { s3: 5 },
  comments: {
    s1: [
      { id: "c1", author: "Jon Bell", body: "The atmosphere in the first chapter is beautiful.", when: "2h" },
      { id: "c2", author: "Mina L.", body: "I need to know what happens to the map.", when: "5h" },
    ],
    s2: [{ id: "c3", author: "Sara Kim", body: "That final line hooked me immediately.", when: "1d" }],
    s3: [{ id: "c4", author: "Theo P.", body: "The bookshop argument felt painfully real.", when: "3h" }],
  },
};
