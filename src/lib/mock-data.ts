export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isVerified: boolean;
  skillsToTeach: { name: string; level: string; category: string }[];
  skillsToLearn: { name: string; priority: number }[];
  learningStyle: 'visual' | 'practical' | 'discussion';
  xpPoints: number;
  badges: { name: string; icon: string; earnedAt: string }[];
  mentorLevel: string;
  totalSessionsCompleted: number;
  totalHoursTaught: number;
  averageRating: number;
  lastActive: string;
}

export interface MatchResult {
  userId: string;
  name: string;
  avatar: string;
  teaches: string[];
  learns: string[];
  matchScore: number;
  matchReasons: string[];
  mentorLevel: string;
  averageRating: number;
  learningStyle: string;
}

export interface Session {
  id: string;
  partnerName: string;
  partnerAvatar: string;
  scheduledAt: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  skillFocus: string;
}

export interface Activity {
  id: string;
  type: 'connection' | 'session' | 'badge' | 'review';
  message: string;
  timestamp: string;
}

export const currentUser: User = {
  id: 'u1',
  name: 'Alex Chen',
  email: 'alex@example.com',
  avatar: '',
  isVerified: true,
  skillsToTeach: [
    { name: 'React', level: 'Expert', category: 'Tech' },
    { name: 'TypeScript', level: 'Expert', category: 'Tech' },
    { name: 'UI Design', level: 'Intermediate', category: 'Design' },
  ],
  skillsToLearn: [
    { name: 'Guitar', priority: 1 },
    { name: 'Spanish', priority: 2 },
    { name: 'Photography', priority: 3 },
  ],
  learningStyle: 'practical',
  xpPoints: 1250,
  badges: [
    { name: 'First Lesson', icon: '🎓', earnedAt: '2024-01-15' },
    { name: 'On a Roll', icon: '🔥', earnedAt: '2024-02-20' },
    { name: 'Top Rated', icon: '⭐', earnedAt: '2024-03-01' },
  ],
  mentorLevel: 'Expert',
  totalSessionsCompleted: 24,
  totalHoursTaught: 18,
  averageRating: 4.8,
  lastActive: new Date().toISOString(),
};

export const mockMatches: MatchResult[] = [
  {
    userId: 'u2',
    name: 'Priya Sharma',
    avatar: '',
    teaches: ['Guitar', 'Music Theory'],
    learns: ['React', 'Web Development'],
    matchScore: 96,
    matchReasons: ['Perfect skill swap', 'Same learning style', 'Recently active'],
    mentorLevel: 'Practitioner',
    averageRating: 4.9,
    learningStyle: 'practical',
  },
  {
    userId: 'u3',
    name: 'Marcus Johnson',
    avatar: '',
    teaches: ['Spanish', 'Portuguese'],
    learns: ['TypeScript', 'Node.js'],
    matchScore: 91,
    matchReasons: ['Strong skill match', 'High rating'],
    mentorLevel: 'Expert',
    averageRating: 4.7,
    learningStyle: 'discussion',
  },
  {
    userId: 'u4',
    name: 'Yuki Tanaka',
    avatar: '',
    teaches: ['Photography', 'Lightroom'],
    learns: ['UI Design', 'Figma'],
    matchScore: 87,
    matchReasons: ['Complementary skills', 'Active this week'],
    mentorLevel: 'Learner',
    averageRating: 4.5,
    learningStyle: 'visual',
  },
  {
    userId: 'u5',
    name: 'Lena Müller',
    avatar: '',
    teaches: ['Piano', 'Music Production'],
    learns: ['React', 'CSS'],
    matchScore: 82,
    matchReasons: ['Skill overlap', 'Similar timezone'],
    mentorLevel: 'Practitioner',
    averageRating: 4.6,
    learningStyle: 'practical',
  },
  {
    userId: 'u6',
    name: 'David Kim',
    avatar: '',
    teaches: ['Korean', 'Calligraphy'],
    learns: ['TypeScript', 'React'],
    matchScore: 78,
    matchReasons: ['Strong demand match'],
    mentorLevel: 'Novice',
    averageRating: 4.3,
    learningStyle: 'visual',
  },
];

export const mockSessions: Session[] = [
  {
    id: 's1',
    partnerName: 'Priya Sharma',
    partnerAvatar: '',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    status: 'confirmed',
    skillFocus: 'Guitar Basics - Chord Progressions',
  },
  {
    id: 's2',
    partnerName: 'Marcus Johnson',
    partnerAvatar: '',
    scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    status: 'confirmed',
    skillFocus: 'Spanish Conversational Practice',
  },
  {
    id: 's3',
    partnerName: 'Yuki Tanaka',
    partnerAvatar: '',
    scheduledAt: new Date(Date.now() + 74 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    status: 'pending',
    skillFocus: 'Photography Composition',
  },
];

export const mockActivities: Activity[] = [
  { id: 'a1', type: 'session', message: 'Completed a Guitar session with Priya', timestamp: '2 hours ago' },
  { id: 'a2', type: 'badge', message: 'Earned the "On a Roll" badge 🔥', timestamp: '1 day ago' },
  { id: 'a3', type: 'connection', message: 'Connected with Marcus Johnson', timestamp: '2 days ago' },
  { id: 'a4', type: 'review', message: 'Received a 5-star review from Yuki', timestamp: '3 days ago' },
  { id: 'a5', type: 'session', message: 'Taught React hooks to David Kim', timestamp: '4 days ago' },
];

export const skillCategories = ['Tech', 'Arts', 'Language', 'Business', 'Music', 'Design', 'Science', 'Sports'];

export const popularSkills = [
  'React', 'Python', 'JavaScript', 'TypeScript', 'UI Design', 'Figma',
  'Guitar', 'Piano', 'Photography', 'Video Editing',
  'Spanish', 'French', 'Japanese', 'Korean', 'Mandarin',
  'Marketing', 'SEO', 'Public Speaking', 'Leadership',
  'Yoga', 'Cooking', 'Drawing', 'Writing', 'Data Science',
];

export function getMentorLevelColor(level: string) {
  switch (level) {
    case 'Novice': return 'text-muted-foreground';
    case 'Learner': return 'text-blue-400';
    case 'Practitioner': return 'text-purple-400';
    case 'Expert': return 'text-primary';
    case 'Mentor': return 'text-yellow-400';
    default: return 'text-muted-foreground';
  }
}

export function getXpForLevel(level: string) {
  switch (level) {
    case 'Novice': return { min: 0, max: 200 };
    case 'Learner': return { min: 201, max: 500 };
    case 'Practitioner': return { min: 501, max: 1000 };
    case 'Expert': return { min: 1001, max: 2500 };
    case 'Mentor': return { min: 2501, max: 5000 };
    default: return { min: 0, max: 200 };
  }
}
