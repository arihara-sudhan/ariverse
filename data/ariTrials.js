export const ariTrials = [
  {
    id: 'trial-1',
    title: 'ResNet50 vs ViT ::: Who Handles Chaos Better?',
    description: 'When data gets messy, does attention beat convolution? Both models shine on clean datasets like MNIST. But throw in high intraclass variance and ResNet50 stumbles to 56% while ViT holds steady at 77%. So which one would you trust when things get unpredictable?',
    imageUrl: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/ari.webp',
    readMoreUrl: '/aris-xperiments?id=1',
  },
  {
    id: 'trial-2',
    title: 'Does a FewShot Model Break When It Sees Too Much?',
    description: 'Training on 3 classes, testing on 7. How far can generalization stretch? Trained on just digits 7, 8, 9 and the model nailed 98%. But as more unseen classes crept in, accuracy quietly eroded. Where exactly does it start to crack?',
    imageUrl: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/glory-lily.webp',
    readMoreUrl: '/aris-xperiments?id=2',
  },
  {
    id: 'trial-3',
    title: "Can a Classifier Secretly Do FewShot's Job?",
    description: 'A model trained to classify... accidentally learned to cluster the unknown. Trained on shades of red, green, and blue then tested on orange, pink, and violet. No triplet loss, no contrastive training. Yet something interesting happened. Can you guess what?',
    imageUrl: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/ari.webp',
    readMoreUrl: '/aris-xperiments?id=3',
  },
  {
    id: 'trial-4',
    title: 'What If We Fed Collages Instead of Single Images?',
    description: 'Same accuracy. 9x fewer embeddings. 10x less memory. One weird trick. Storing individual embeddings for thousands of samples is expensive. So why not collage them? A 3x3 grid, one embedding, accuracy untouched. But does it hold up under pressure?',
    imageUrl: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/glory-lily.webp',
    readMoreUrl: '/aris-xperiments?id=4',
  },
];
