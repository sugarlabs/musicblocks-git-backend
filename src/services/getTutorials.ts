export const tutorials = [
  {
    step: 1,
    title: "What is Version Control?",
    content: "Version control helps you track changes to your project over time. Think of it like a save history in a video game!",
    tip: "Every time you save your Music Blocks project, you are creating a version."
  },
  {
    step: 2,
    title: "What is a Commit?",
    content: "A commit is a snapshot of your project at a specific point in time. You can always go back to any commit.",
    tip: "Write a good commit message so you remember what you changed!"
  },
  {
    step: 3,
    title: "What is a Fork?",
    content: "Forking means making your own copy of someone else's project. You can experiment freely without affecting the original.",
    tip: "Fork a friend's Music Blocks project and try remixing it!"
  },
  {
    step: 4,
    title: "What is a Branch?",
    content: "A branch is a separate version of your project where you can try new ideas safely.",
    tip: "Create a branch when you want to experiment without breaking your main project."
  },
  {
    step: 5,
    title: "What is a Pull Request?",
    content: "A pull request lets you suggest your changes to someone else's project. They can review and merge your work.",
    tip: "Send a pull request to share your remix with the original project creator!"
  },
];

export const getTutorials = () => tutorials;

export const getTutorialByStep = (step: number) => {
  return tutorials.find((t) => t.step === step) || null;
};