export const MINI_PROJECT_CATEGORIES = [
  'LLM & NLP',
  'Computer Vision',
  'Generative AI',
  'Deep Learning Fundamentals',
  'Reinforcement Learning',
  'Web Development',
  'Game Development',
  '3D Modeling (Blender)',
  'Python Utilities & Automation',
];

const miniProjectsRaw = [
  { title: 'Genie-Phenie: An LLM for Gene Screening', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7374132905410772992', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/genie-phenie.webp' },
  { title: 'Arachnid LLM: My Very First LLM', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7360606276617191424', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/arachnid-llm.webp' },
  { title: 'Frog Catcher - RL Algorithm', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7357760375796191232', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/frog-rl.webp' },
  { title: 'Modeling - Angel Fish: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7330121255318093824', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/angel-fish-3d.webp' },
  { title: 'Dialect Classification', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7302169576396464128?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/dialect-classification.webp' },
  { title: 'Next Word Prediction: Bigram', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7296489686649253888?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/next-word-prediction.webp' },
  { title: 'Next Tamil Word Prediction: Bigram', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7297217969393217537?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/next-word-prediction-tamil.webp' },
  { title: 'RAG Application', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7283640086405988352?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/rag-application.webp' },
  { title: 'Object Detection: YOLO', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7267402294789324800?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/yolo-object-detection.webp' },
  { title: 'Photo Enhancement: AutoEncoder', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7253678224923086848?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/photo-enhancer.webp' },
  { title: 'Noise Removal: AutoEncoder', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7252203894187991040?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/noise-removal.webp' },
  { title: 'Classify Anything: Swin Transformer', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7240085188939018242?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/classify-anything.webp' },
  { title: 'Puthu Words: ReactJs', embedLink: 'https://arihara-sudhan.github.io/puthu-words', logo: './statics/puthuwords.webp' },
  { title: 'Uyir Kural: ReactJs', embedLink: 'https://arihara-sudhan.github.io/uyir-kural', logo: './statics/uyirkural.webp' },
  { title: 'MNIST Image Generation', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7231973924685684736?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/mnist-image-generation.webp' },
  { title: 'Modeling - Pterodactyl: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7144712946940526592?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/pterodactyl.webp' },
  { title: 'Fewshot Object Detection', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7140349143436173313?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/fewshot-object-detection.webp' },
  { title: 'Neural Style Transfer', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7126364381965082624?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/neural-style-transfer.webp' },
  { title: 'Image Segmentation: GMM', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7116334256326406145?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/image-segmentation.webp' },
  { title: 'CLIP: Text to Image', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7110589582114492416?collapsed=1', logo: 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/mini-projects/clip-image-text.webp' },
  { title: 'Modeling - Kangaroo: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7094853863224053760?collapsed=1', logo: './statics/kangaroo.webp' },
  { title: 'SIFT Image Mapping', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7093236647177162752?collapsed=1', logo: './statics/sift.webp' },
  { title: 'Tamil Letters Classification', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7084184926840909825?collapsed=1', logo: './statics/tom-tamil.webp' },
  { title: 'Modeling - Monitor Lizard: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7083434382073495552?collapsed=1', logo: './statics/monitor.webp' },
  { title: 'Sentiment Analysis', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7074554168719376384?collapsed=1', logo: './statics/sentiment.webp' },
  { title: 'Image Similarity: Contrastive Loss', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7055342604263030784?collapsed=1', logo: './statics/siamese.webp' },
  { title: 'MNIST Digit Classification', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7052670144858226688?collapsed=1', logo: './statics/digit.webp' },
  { title: 'ToDo App: MERN Stack', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7021156006323781632?collapsed=1', logo: './statics/todo.webp' },
  { title: 'Fire Dino Run: Game', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7018924265177550848?collapsed=1', logo: './statics/fire-dino.webp' },
  { title: 'Insectipedia: Django', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7015923254603243520?collapsed=1', logo: './statics/insects.webp' },
  { title: 'Math Quiz: TailWind CSS', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6984895231573852160?collapsed=1', logo: './statics/mquiz.webp' },
  { title: 'Pupil Detection', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6978642626308620288?collapsed=1', logo: './statics/pupil.webp' },
  { title: 'Wildlife Gifography: Grid in CSS', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6975164203548520448?collapsed=1', logo: './statics/wildlife.webp' },
  { title: 'Video UI: HTML, CSS', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6972946919442591745?collapsed=1', logo: './statics/dolphin.webp' },
  { title: 'WhatsApp UI: ReactJs', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6966312877095874560?collapsed=1', logo: './statics/wsapp.webp' },
  { title: 'YouTube UI: ReactJs', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6964335136008011776?collapsed=1', logo: './statics/youtube.webp' },
  { title: 'Multiface Detection', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6962956019358478336?collapsed=1', logo: './statics/faces.webp' },
  { title: 'Modeling - Dinosaur: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6962232401783660544?collapsed=1', logo: './statics/dino.webp' },
  { title: 'Modeling - Bacteriophage: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7100351864499539968?collapsed=1', logo: './statics/phage.webp' },
  { title: 'Color Clustering - K Means', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7096728837350178816?collapsed=1', logo: './statics/color.webp' },
  { title: 'Image Segmentation - K Means', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7087300803039805440?collapsed=1', logo: './statics/tiger.webp' },
  { title: 'Erectus Run: GDevelop', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7040349848188981248?collapsed=1', logo: './statics/erectus.webp' },
  { title: 'Kural.py', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6997978081890115584?collapsed=1', logo: './statics/kural.webp' },
  { title: 'Web Piano: HTML, CSS, JS', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6985172413353254913?collapsed=1', logo: './statics/web-piano.webp' },
  { title: 'Instagram Profile Clone: ReactJs', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6961959147537911808?collapsed=1', logo: './statics/igui.webp' },
  { title: 'Speech Recognition for Web Development', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6960289604079927296?collapsed=1', logo: './statics/speech-web.webp' },
  { title: 'Virtual Quiz: CVZone, MediaPipe', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6959338801026514944?collapsed=1', logo: './statics/vquiz.webp' },
  { title: 'Hand Recognition based Car Game', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6957638844187828224?collapsed=1', logo: './statics/vcar.webp' },
  { title: 'Virtual Screen Lock', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6956094364120989696?collapsed=1', logo: './statics/vlock.webp' },
  { title: 'Tom Counts Fingers', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6955013663149748224?collapsed=1', logo: './statics/tom-finger.webp' },
  { title: 'Speech Recognition based Calculator', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6954765334704791552?collapsed=1', logo: './statics/speech-calc.webp' },
  { title: 'Modeling - Elephant: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6953434203518640128?collapsed=1', logo: './statics/elephant.webp' },
  { title: 'Piano: PyGame', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6952806705755815936?collapsed=1', logo: './statics/py-piano.webp' },
  { title: 'YouTube Video Downloader', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6952235596727603200?collapsed=1', logo: './statics/yt-video.webp' },
  { title: 'Animals Sounds: PyGame', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6951361462732746752?collapsed=1', logo: './statics/animalsound.webp' },
  { title: 'Reversing A Video: OpenCV', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6948339546610626560?collapsed=1', logo: './statics/reverse-vid.webp' },
  { title: 'Fruit selling Website: Bootstrap3', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6948179503940546560?collapsed=1', logo: './statics/fruits.webp' },
  { title: 'Modeling - Pig: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6946771382978367488?collapsed=1', logo: './statics/pig.webp' },
  { title: 'Hand Recognition: CVZone', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6946166114267598848?collapsed=1', logo: './statics/hand-det.webp' },
  { title: 'Fire Detector: OpenCV', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6945056173683281920?collapsed=1', logo: './statics/fire.webp' },
  { title: 'Modeling - Flag: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6916570462848233472?collapsed=1', logo: './statics/flag.webp' },
  { title: 'Modeling - Rodent: Blender', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6914165693408022528?collapsed=1', logo: './statics/rodent.webp' },
  { title: 'Talking Tom', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6911407758030331904?collapsed=1', logo: './statics/talking-tom.webp' },
  { title: 'Face Detection: OpenCV', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6909668773356580864?collapsed=1', logo: './statics/face.webp' },
  { title: 'Animated 2D WindMill - Turtle', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6905119277087559680?collapsed=1', logo: './statics/windmill.webp' },
  { title: 'Dino Run: PyGame', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6904343514822307840?collapsed=1', logo: './statics/dinorun.webp' },
  { title: 'ShinChan: Turtle', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6902946166963544064?collapsed=1', logo: './statics/chan.webp' },
  { title: 'Space Shooter: Ruby Gosu', embedLink: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:6902225806215438336?collapsed=1', logo: './statics/space-ship.webp' },
];

function inferCategory(title = '') {
  const t = title.toLowerCase();
  if (t.includes('modeling') && t.includes('blender')) return '3D Modeling (Blender)';
  if (t.includes('llm') || t.includes('rag') || t.includes('sentiment') || t.includes('dialect') || t.includes('word prediction') || t.includes('tamil letters') || t.includes('kural.py')) return 'LLM & NLP';
  if (t.includes('image generation') || t.includes('style transfer') || t.includes('clip: text to image')) return 'Generative AI';
  if (t.includes('rl algorithm')) return 'Reinforcement Learning';
  if (t.includes('reactjs') || t.includes('mern') || t.includes('django') || t.includes('tailwind') || t.includes('html') || t.includes('css') || t.includes('bootstrap') || t.includes('website') || t.includes('ui')) return 'Web Development';
  if (t.includes('game') || t.includes('pygame') || t.includes('gdevelop') || t.includes('gosu') || t.includes('dino run') || t.includes('space shooter') || t.includes('talking tom')) return 'Game Development';
  if (t.includes('autoencoder') || t.includes('swin transformer') || t.includes('contrastive') || t.includes('mnist digit classification')) return 'Deep Learning Fundamentals';
  if (t.includes('opencv') || t.includes('detection') || t.includes('segmentation') || t.includes('sift') || t.includes('clustering') || t.includes('recognition') || t.includes('pupil') || t.includes('multiface') || t.includes('screen lock') || t.includes('counts fingers') || t.includes('mediapipe') || t.includes('cvzone')) return 'Computer Vision';
  return 'Python Utilities & Automation';
}

export const miniProjects = miniProjectsRaw.map((project) => ({
  ...project,
  category: inferCategory(project.title),
}));


