import type { TextItem } from '../types';

export const texts: TextItem[] = [
  // === Easy (简单) ===
  {
    id: 'easy-1',
    title: 'The Quick Brown Fox',
    difficulty: 'easy',
    content: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    id: 'easy-2',
    title: 'Sunny Morning',
    difficulty: 'easy',
    content: 'The sun is shining bright today. Birds are singing in the trees. It is a good day to go outside.',
  },
  {
    id: 'easy-3',
    title: 'Simple Greeting',
    difficulty: 'easy',
    content: 'Hello, how are you? I am fine, thank you. Nice to meet you. Have a great day ahead.',
  },
  {
    id: 'easy-4',
    title: 'My Pet Cat',
    difficulty: 'easy',
    content: 'I have a small cat. She likes to sleep on the sofa. Her name is Mimi. She is very cute and soft.',
  },
  {
    id: 'easy-5',
    title: 'Going to School',
    difficulty: 'easy',
    content: 'I go to school every day. I like to read books and play with my friends. School is fun and I learn new things.',
  },
  {
    id: 'easy-6',
    title: 'The Park',
    difficulty: 'easy',
    content: 'We went to the park. The kids played on the swings. Dogs ran on the grass. It was a nice afternoon.',
  },

  // === Medium (中等) ===
  {
    id: 'medium-1',
    title: 'Climate Change Overview',
    difficulty: 'medium',
    content: 'Climate change is one of the most pressing issues of our time. Rising global temperatures are causing sea levels to rise, weather patterns to shift, and ecosystems to be disrupted across the planet.',
  },
  {
    id: 'medium-2',
    title: 'The History of Coffee',
    difficulty: 'medium',
    content: 'Coffee was first discovered in Ethiopia around the 9th century. A goat herder noticed his animals became energetic after eating certain berries. Today, coffee is the second most traded commodity in the world.',
  },
  {
    id: 'medium-3',
    title: 'Space Exploration',
    difficulty: 'medium',
    content: 'Since the first moon landing in 1969, humanity has made remarkable progress in space exploration. Rovers now traverse the surface of Mars, and private companies are developing reusable rockets for commercial space travel.',
  },
  {
    id: 'medium-4',
    title: 'Healthy Eating Habits',
    difficulty: 'medium',
    content: 'A balanced diet includes fruits, vegetables, whole grains, and lean proteins. Nutritionists recommend eating at least five servings of fruits and vegetables daily, while limiting processed foods and added sugars.',
  },
  {
    id: 'medium-5',
    title: 'The Internet Revolution',
    difficulty: 'medium',
    content: 'The internet has transformed how we communicate, work, and access information. What began as a military research project in the 1960s has evolved into a global network connecting billions of people worldwide.',
  },
  {
    id: 'medium-6',
    title: 'Ocean Conservation',
    difficulty: 'medium',
    content: 'Our oceans cover more than 70 percent of the Earth\'s surface and are home to millions of species. However, pollution, overfishing, and climate change threaten marine ecosystems that are vital to our planet\'s health.',
  },

  // === Hard (困难) ===
  {
    id: 'hard-1',
    title: 'Quantum Computing Principles',
    difficulty: 'hard',
    content: 'Quantum computing leverages the principles of quantum mechanics, including superposition and entanglement, to process information in fundamentally different ways than classical computers. While traditional bits exist as either 0 or 1, quantum bits (qubits) can exist in multiple states simultaneously, enabling exponential increases in computational power for specific problem domains such as cryptography, drug discovery, and optimization.',
  },
  {
    id: 'hard-2',
    title: 'Neural Network Architecture',
    difficulty: 'hard',
    content: 'Deep neural networks consist of multiple layers of interconnected nodes that process and transform data through learned weight matrices. Backpropagation algorithms adjust these weights by computing gradients of the loss function with respect to each parameter, enabling the network to minimize prediction errors iteratively. Modern architectures like transformers utilize self-attention mechanisms to capture long-range dependencies in sequential data.',
  },
  {
    id: 'hard-3',
    title: 'Economic Theory of Markets',
    difficulty: 'hard',
    content: 'The efficient market hypothesis posits that asset prices fully reflect all available information, making it impossible to consistently achieve returns exceeding average market returns on a risk-adjusted basis. Critics argue that behavioral biases, information asymmetries, and market microstructure effects create persistent anomalies that contradict the assumptions of rational agents and frictionless trading underlying the hypothesis.',
  },
  {
    id: 'hard-4',
    title: 'Molecular Biology of CRISPR',
    difficulty: 'hard',
    content: 'CRISPR-Cas9 is a revolutionary gene-editing technology derived from bacterial immune systems. The Cas9 endonuclease, guided by a synthetic single-guide RNA complementary to the target DNA sequence, introduces double-strand breaks at precise genomic locations. Cellular repair mechanisms, including non-homologous end joining and homology-directed repair, then modify the genetic sequence, enabling researchers to knock out genes, correct mutations, or insert new genetic material.',
  },
  {
    id: 'hard-5',
    title: 'Philosophy of Consciousness',
    difficulty: 'hard',
    content: 'The hard problem of consciousness, as articulated by philosopher David Chalmers, asks why and how physical processes in the brain give rise to subjective phenomenal experience. While neuroscience has made significant progress in identifying neural correlates of consciousness, the explanatory gap between objective brain states and the qualitative character of first-person experience remains one of the most profound unsolved problems in philosophy of mind.',
  },
  {
    id: 'hard-6',
    title: 'Distributed Systems Consensus',
    difficulty: 'hard',
    content: 'In distributed computing, achieving consensus among nodes in the presence of failures is formalized by the Paxos and Raft algorithms. These protocols guarantee safety properties—ensuring that all non-faulty nodes agree on the same value—even when network partitions and message delays occur. The CAP theorem demonstrates that distributed systems cannot simultaneously provide consistency, availability, and partition tolerance, forcing architects to make deliberate trade-offs.',
  },
];
