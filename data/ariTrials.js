import { toPublicStorageUrl } from '../lib/storage';

export const ariTrials = [
  {
    id: 'trial-1',
    title: 'ResNet50 vs ViT ::: Who Handles Chaos Better?',
    description: 'When data gets messy, does attention beat convolution? Both models shine on clean datasets like MNIST. But throw in high intraclass variance and ResNet50 stumbles to 56% while ViT holds steady at 77%. So which one would you trust when things get unpredictable?',
    imageUrl: toPublicStorageUrl('assets/hero.webp'),
    readMoreUrl: '/aris-xperiments?id=1',
    detailText: `## The question

When data is clean and simple, both ResNet50 and ViT can look equally strong. The real test begins when the classes stop looking neat and the same label appears in many different visual forms.

## What we tested

We compared the two models on clean data first, then on a version with high intraclass variance. That means the samples from the same class were allowed to look very different from each other, which is the kind of setting where shortcuts usually fail.

## What happened

On easy datasets like MNIST, both models performed well. But once the samples became visually messy, ResNet50 dropped sharply to 56% while ViT stayed at 77%.

## What it means

ResNet50 is excellent when local patterns are enough. ViT keeps more global context and stays steadier when the same class can appear in many forms.

The lesson is simple: the data should decide the model, not the trend. When the input space becomes unpredictable, global attention can be the safer bet.
`,
  },
  {
    id: 'trial-2',
    title: 'Does a FewShot Model Break When It Sees Too Much?',
    description: 'Training on 3 classes, testing on 7. How far can generalization stretch? Trained on just digits 7, 8, 9 and the model nailed 98%. But as more unseen classes crept in, accuracy quietly eroded. Where exactly does it start to crack?',
    imageUrl: toPublicStorageUrl('assets/glory-lily.webp'),
    readMoreUrl: '/aris-xperiments?id=2',
    detailText: `## The setup

This experiment used a FewShot-style model trained on only three digit classes: 7, 8, and 9. The idea was to see how far the learned embedding space could stretch when the test set began including classes the model had never seen before.

## The pattern we saw

The model reached 98% accuracy on the original three classes. That is strong, but the interesting part started when new digits were introduced at test time.

As more unseen classes were added, accuracy gradually declined. The drop was not sudden at first, but it was steady. That is usually what model stress looks like in practice.

## The twist

When digit 1 was introduced, the score bumped up a little because it visually resembles digit 7, one of the training classes. That told us the model was not guessing randomly. It was still using similarity, just within a crowded embedding space.

## Takeaway

FewShot models generalize well, but only inside a comfort zone. Once too many new classes arrive, the space gets crowded and the boundary becomes harder to preserve.
`,
  },
  {
    id: 'trial-3',
    title: "Can a Classifier Secretly Do FewShot's Job?",
    description: 'A model trained to classify... accidentally learned to cluster the unknown. Trained on shades of red, green, and blue then tested on orange, pink, and violet. No triplet loss, no contrastive training. Yet something interesting happened. Can you guess what?',
    imageUrl: toPublicStorageUrl('assets/hero.webp'),
    readMoreUrl: '/aris-xperiments?id=3',
    detailText: `## The surprise

We usually think of classifiers as fixed-boundary models. They learn the labels they were given and that is supposed to be the end of the story.

## What we tried

The model was trained on color shade classes: red, green, and blue. Later we tested it on completely unseen color families such as orange, pink, and violet.

## What happened

Even without triplet loss or contrastive training, the classifier still formed meaningful clusters for the unseen shades. The clusters were not perfect, but they were not random either.

## Why that matters

The network had learned more than label boundaries. It had picked up structure in the color space itself.

That is the fun part of representation learning: sometimes a classifier secretly learns a more general map of the world than we asked it to.
`,
  },
  {
    id: 'trial-4',
    title: 'What If We Fed Collages Instead of Single Images?',
    description: 'Same accuracy. 9x fewer embeddings. 10x less memory. One weird trick. Storing individual embeddings for thousands of samples is expensive. So why not collage them? A 3x3 grid, one embedding, accuracy untouched. But does it hold up under pressure?',
    imageUrl: toPublicStorageUrl('assets/glory-lily.webp'),
    readMoreUrl: '/aris-xperiments?id=4',
    detailText: `## The idea

FewShot systems usually store one embedding per image. That works, but it becomes expensive when the support set grows large.

So the question was simple: what if we packed multiple images into one collage and stored a single embedding for that collage?

## What we measured

Using individual images required 1621 embeddings. That took 35 seconds to extract and occupied 981 MB.

The collage approach reduced the count to 182 embeddings. Extraction dropped to 3 seconds and storage shrank to 105 MB.

## What stayed the same

Accuracy stayed at 99.01% in both cases.

## Why this is interesting

The collage version did not just save memory. It also averaged out some of the noise from individual outliers, which can make the embedding space more stable.

The result was a cleaner and smaller representation without paying an accuracy penalty.
`,
  },
];
