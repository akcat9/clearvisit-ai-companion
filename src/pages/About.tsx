import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import createAppointmentImg from "@/assets/create-appointment.png";
import preVisitEducationImg from "@/assets/pre-visit-education.png";
import startRecordingImg from "@/assets/start-recording.png";
import aiAnalysisImg from "@/assets/ai-analysis.png";
import shareVisitImg from "@/assets/share-visit.png";

const About = () => {
  const features = [
    {
      image: createAppointmentImg,
      title: "Create Appointment",
      description: "Schedule and organize your doctor visits with ease. Add details about your symptoms, goals, and medical history to prepare for your visit."
    },
    {
      image: preVisitEducationImg,
      title: "Pre-Visit Education",
      description: "Learn about your condition before your appointment. Get prepared with relevant questions and information about possible causes, symptoms, and visit preparation."
    },
    {
      image: startRecordingImg,
      title: "Start Recording",
      description: "After finishing with your appointment, click start recording to capture the entire conversation. Click stop recording when done to save your visit."
    },
    {
      image: aiAnalysisImg,
      title: "AI Analysis",
      description: "Get intelligent summaries of your visits with AI. Review key symptoms, medical terms explained, prescriptions, and personalized insights from your doctor visit."
    },
    {
      image: shareVisitImg,
      title: "Share Visit",
      description: "Easily share visit summaries with family members or other healthcare providers who need to know. Add recipient emails and optional personal messages."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Our Goal Section */}
          <section className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Our Goal
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Healthcare can often feel confusing and opaque. tadoc's mission is to make every patient fully informed and empowered during their doctor visits. By providing clear summaries, guidance, and support, tadoc helps patients understand their care, ask better questions, make confident health decisions, and share their visit details with family and friends who care about them.
            </p>
          </section>

          {/* Features Section */}
          <section className="space-y-6 pt-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground">
              How tadoc Works
            </h2>
            
            <div className="grid gap-6 sm:gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      <div className="w-full">
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <div className="p-6 space-y-2">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                          {feature.title}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default About;
