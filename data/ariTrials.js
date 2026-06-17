import { toPublicStorageUrl } from '../lib/storage';

export const ariTrials = [
  {
    id: 'trial-1',
    title: 'ResNet50 vs ViT ::: Who Handles Chaos Better?',
    description: 'When data gets messy, does attention beat convolution? Both models shine on clean datasets like MNIST. But throw in high intraclass variance and ResNet50 stumbles to 56% while ViT holds steady at 77%. So which one would you trust when things get unpredictable?',
    imageUrl: toPublicStorageUrl('ari-xperiments/resnet-vs-vit/resnet-vs-vit-hero.webp'),
    readMoreUrl: '/aris-xperiments?id=1',
    detailText: `This research focuses on a comparative analysis between two powerful deep learning architectures, ResNet50 and the Vision Transformer (ViT), particularly when they are subjected to datasets with varying levels of intraclass variance.

![ResNet50 vs ViT hero](https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/ari-xperiments/resnet-vs-vit/resnet-vs-vit.webp)

The experiment was designed to highlight how each model responds differently depending on the complexity and variability present in the training and testing data. To establish a baseline, both models were first evaluated on simpler, well-known datasets such as MNIST and Omniglot, which are characterized by low intraclass variance and relatively straightforward visual patterns.

In these controlled conditions, ResNet50 demonstrated outstanding performance, achieving an accuracy of 99%, which underscores its exceptional capability in recognizing structured and repetitive patterns with high precision. The ViT model, while slightly behind at 96%, still performed admirably, though the gap in performance at this stage already hints at the fundamental architectural differences between the two.

ResNet50, being a convolutional neural network, is inherently designed to extract local spatial features through its deep residual connections, making it particularly well-suited for datasets where patterns are consistent and predictable. The ViT, on the other hand, leverages a self-attention mechanism that processes image patches globally, which may not offer the same advantage when dealing with simple, low-variance datasets but begins to shine when the complexity increases.

When the experiment transitioned to datasets with high intraclass variance, where samples belonging to the same class can look drastically different from one another, the results told a very different story. ResNet50's accuracy dropped sharply to 56%, revealing a significant limitation in its ability to generalize across highly variable data distributions.

The model's reliance on local feature extraction becomes a bottleneck when the visual characteristics of the same class differ substantially. In stark contrast, the ViT model maintained a considerably higher accuracy of 77%, demonstrating its superior ability to capture global context and long-range dependencies within an image.

This contextual understanding allows the ViT to better adapt to scenarios where the relationship between different parts of an image is more informative than local textures or edges alone. The research ultimately emphasizes that neither model is universally superior, and each has its own domain of excellence, so the choice between ResNet50 and ViT should be guided by the nature of the dataset and the specific demands of the task at hand.`,
  },
  {
    id: 'trial-2',
    title: 'Does a FewShot Model Break When It Sees Too Much?',
    description: 'Training on 3 classes, testing on 7. How far can generalization stretch? Trained on just digits 7, 8, 9 and the model nailed 98%. But as more unseen classes crept in, accuracy quietly eroded. Where exactly does it start to crack?',
    imageUrl: toPublicStorageUrl('ari-xperiments/fewshot-breaks/fewshot-breaks-hero.webp'),
    readMoreUrl: '/aris-xperiments?id=2',
    detailText: `This research delves into a fascinating and somewhat counterintuitive behavioral pattern observed in few-shot learning models, specifically how their generalization capability progressively deteriorates as the number of unseen classes introduced during testing increases, making them increasingly resemble the limitations traditionally associated with classification models.

The experiment was initiated by training a few-shot model using a triplet loss setup, a technique that encourages the model to learn a meaningful embedding space by pulling similar samples together and pushing dissimilar ones apart.

![FewShot model as classification](https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/ari-xperiments/fewshot-breaks/fewshot-as-classification.webp)

The training was conducted exclusively on three classes from the MNIST dataset, namely digits 7, 8, and 9, and the model achieved a remarkable accuracy of 98% when tested on the same set of classes, confirming that the embedding space learned was highly discriminative and well-structured.

However, as the testing phase began to introduce classes that were entirely unseen during training, the model's behavior started to shift in interesting ways. When tested on two new classes, digits 5 and 6, the accuracy remained strong at 90%, suggesting that the model had developed a robust enough understanding of the embedding space to generalize reasonably well to closely related unseen classes.

As the number of unseen classes expanded further, first to three (4, 5, 6), then to four (3, 4, 5, 6), and so on, the accuracy continued to decline in a fairly consistent pattern, dropping to 89%, then 84%, and further down as more classes were added. This gradual degradation reveals that the model's embedding space, while powerful within familiar territory, becomes increasingly overwhelmed when asked to distinguish between a growing number of classes it has never encountered before.

![FewShot class vs accuracy](https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/ari-xperiments/fewshot-breaks/class_vs_accuracy.webp)

An intriguing anomaly was observed when digit 1 was introduced into the testing set, as its visual similarity to digit 7, one of the training classes, appeared to give the model a reference point, causing a slight uptick in accuracy. This highlights an important nuance in that the model's generalization is not just about the number of unseen classes but also about how visually or structurally similar those unseen classes are to the ones encountered during training.

Throughout the experiment, comparisons were also drawn with K-Means clustering as a baseline, and in all cases, the few-shot model significantly outperformed it, reinforcing its value even in degraded conditions. The key takeaway from this research is that few-shot models, when pushed beyond a certain threshold of unseen classes, begin to mirror the generalization failures typically attributed to standard classifiers, suggesting that careful consideration must be given to the ratio of training classes to testing classes when deploying such models in real-world scenarios.`,
  },
  {
    id: 'trial-3',
    title: "Can a Classifier Secretly Do FewShot's Job?",
    description: 'A model trained to classify... accidentally learned to cluster the unknown. Trained on shades of red, green, and blue then tested on orange, pink, and violet. No triplet loss, no contrastive training. Yet something interesting happened. Can you guess what?',
    imageUrl: toPublicStorageUrl('ari-xperiments/classifier-as-fewshot/classifier-as-fewshot.webp'),
    readMoreUrl: '/aris-xperiments?id=3',
    detailText: `This research explores the reverse of the previous experiment's premise, and instead of examining how a few-shot model can fail like a classifier, it investigates how a standard classification model can, under the right conditions, exhibit behavior reminiscent of few-shot learning by forming meaningful and interpretable clusters for classes it has never been explicitly trained on.

The experiment was designed around a visually intuitive dataset consisting of images representing various shades of red, green, and blue, which are three broad color categories that the classifier was trained to distinguish. Once trained, the model was expected to have developed internal representations, or embeddings, that captured the underlying visual structure of these color families in a well-organized feature space.

![Classifier as FewShot](https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/ari-xperiments/classifier-as-fewshot/classifier-as-fewshot.webp)

The remarkable finding came during the testing phase, when entirely new and unseen color classes, specifically shades of orange, pink, and violet, were introduced to the model. Rather than producing random or chaotic outputs, the classifier demonstrated a surprisingly structured response, grouping these unseen color shades into distinct and coherent clusters within its learned embedding space.

This emergent clustering behavior, observed visually to resemble the organized formation of Starlink satellites, suggests that the model had internalized a deeper understanding of color relationships and visual similarity that transcended its explicit training objective.

While it is important to acknowledge that this behavior does not match the precision or robustness of dedicated few-shot learning techniques such as triplet loss training or contrastive learning, which are explicitly designed and optimized for such generalization tasks, the classifier's performance in this context is still noteworthy and opens up interesting questions about the latent representational power hidden within conventional classification architectures.

The simplicity of the dataset, involving visually coherent and perceptually meaningful categories like color shades, likely played a significant role in enabling this behavior, and it remains to be seen how well such emergent clustering would hold up on more complex or abstract image categories.

Nevertheless, this research serves as a compelling reminder that the boundary between classification and few-shot learning is not always as rigid as it may seem, and that standard classifiers may possess untapped potential for generalization that has yet to be fully explored or leveraged.`,
  },
  {
    id: 'trial-4',
    title: 'What If We Fed Collages Instead of Single Images?',
    description: 'Same accuracy. 9x fewer embeddings. 10x less memory. One weird trick. Storing individual embeddings for thousands of samples is expensive. So why not collage them? A 3x3 grid, one embedding, accuracy untouched. But does it hold up under pressure?',
    imageUrl: toPublicStorageUrl('ari-xperiments/collage-helps/collage-helps-hero.webp'),
    readMoreUrl: '/aris-xperiments?id=4',
    detailText: `This research introduces a creative and practically motivated idea aimed at addressing one of the most pressing challenges in few-shot learning at scale, which is the significant computational and memory overhead associated with storing and retrieving embeddings for large numbers of individual samples.

In a typical few-shot learning pipeline, once the model is trained to produce a well-structured embedding space, a database of embeddings is constructed by passing each sample through the model individually and storing the resulting vector representations.

![Collage helps hero](https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/ari-xperiments/collage-helps/collage-helps-hero.webp)

During inference, the embedding of a query sample is compared against this database to find the nearest neighbors and assign a class label. While this approach is conceptually elegant and often yields excellent accuracy, it becomes increasingly impractical as the dataset grows, since both the time required to extract embeddings and the memory needed to store them scale linearly with the number of samples.

The baseline experiment confirmed this concern, as with 1,621 individual samples, embedding extraction took 35 seconds and required 981 MB of storage, while achieving an accuracy of 99.01%.

The proposed solution is deceptively simple yet highly effective, in that instead of treating each sample as an individual input, multiple samples are arranged into a collage, in this case a 3x3 grid of nine images, and the entire collage is passed through the model as a single input to extract a single embedding that collectively represents all nine constituent images.

This approach dramatically reduces the number of embeddings that need to be stored, since one embedding now stands in for many individual samples.

The results were striking, as by switching to collaged embeddings, the total number of samples dropped from 1,621 to just 182, embedding extraction time fell from 35 seconds to just 3 seconds, and memory usage plummeted from 981 MB to just 105 MB, all while maintaining the exact same accuracy of 99.01%.

Beyond the efficiency gains, the collage approach also offers an additional benefit in terms of robustness, since a single embedding is derived from multiple images collectively, the influence of any individual outlier or misrepresentative sample is naturally diluted, reducing the likelihood of misclustering and making the overall embedding database more stable and reliable.

This research opens up a promising direction for scaling few-shot learning systems to real-world applications where computational resources are limited and datasets are large, suggesting that thoughtful preprocessing and representation strategies can yield significant efficiency improvements without sacrificing model performance.`,
  },
];
