import { useState } from 'react';
import { Mic, Sparkles, Heart, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Mic,
    title: 'Record Your Doctor Visits',
    description: 'Easily record your appointments with one tap',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  {
    icon: Sparkles,
    title: 'Get AI-Powered Summaries',
    description: 'Receive clear summaries and key takeaways from every visit',
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
  },
  {
    icon: Heart,
    title: 'Share with Loved Ones',
    description: 'Keep family and caregivers informed with secure sharing',
    colorClass: 'text-pink-500',
    bgClass: 'bg-pink-500/10',
  },
  {
    icon: ClipboardCheck,
    title: 'Prepare Better',
    description: 'Get personalized pre-visit education to make the most of your appointments',
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
  },
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  useState(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  });

  const isLastSlide = current === slides.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-end mb-4">
          <Button variant="ghost" onClick={handleComplete}>
            Skip
          </Button>
        </div>

        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {slides.map((slide, index) => {
              const Icon = slide.icon;
              return (
                <CarouselItem key={index}>
                  <div className="flex flex-col items-center text-center space-y-6 py-12 px-8">
                    <div className={`${slide.bgClass} p-8 rounded-full`}>
                      <Icon className={`w-24 h-24 ${slide.colorClass}`} />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">
                      {slide.title}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-md">
                      {slide.description}
                    </p>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <div className="flex justify-center gap-2 mt-8 mb-6">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {isLastSlide && (
          <div className="flex justify-center">
            <Button onClick={handleComplete} size="lg" className="px-8">
              Get Started
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
