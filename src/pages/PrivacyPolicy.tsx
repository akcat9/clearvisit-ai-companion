import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Privacy Policy
              </h1>
              <p className="text-sm text-muted-foreground">
                Last Updated: Sep 08 2025
              </p>
            </div>

            <div className="prose prose-sm sm:prose-base max-w-none space-y-6">
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy describes how tadoc ("we", "our", or "us") collects, uses, and discloses your information in connection with your use of the "tadoc AI" mobile application (the "App").
              </p>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  1. Information We Collect
                </h2>
                <p className="text-muted-foreground">
                  We collect information to provide and improve our services to you.
                </p>
                
                <h3 className="text-lg font-semibold text-foreground mt-4">
                  A. Information You Provide Directly
                </h3>
                <p className="text-muted-foreground">
                  We do not currently collect any personal information directly from you within the App, such as your name or email address, unless you choose to provide it for support or feedback.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-4">
                  B. Information Collected Automatically
                </h3>
                <p className="text-muted-foreground">
                  The App uses third-party services that may collect certain information automatically. This information may include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Usage Data:</strong> Information about how you use the App, such as your interactions, time spent in the App, and features used.</li>
                  <li><strong>Device Information:</strong> Technical information about your mobile device, including the device type, operating system, unique device identifiers, and mobile network information.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  2. How We Use Your Information
                </h2>
                <p className="text-muted-foreground">
                  The information we collect is used to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide, maintain, and improve the App's functionality.</li>
                  <li>Personalize your user experience.</li>
                  <li>Analyze usage and trends to understand and improve user engagement.</li>
                  <li>Provide technical support and respond to user inquiries.</li>
                  <li>Deliver push notifications and targeted advertising.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  3. Third-Party Services and SDKs
                </h2>
                <p className="text-muted-foreground">
                  The App integrates with and relies on various third-party services to function. These third parties may collect and process information in accordance with their own privacy policies. We do not have control over how they handle your data.
                </p>
                <p className="text-muted-foreground">
                  The App uses the following third-party services:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Google Play:</strong> For App distribution and in-app purchases. <a href="https://policies.google.com/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li><strong>Firebase:</strong> For analytics, crash reporting, and other backend services. <a href="https://firebase.google.com/support/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li><strong>Google AdMob:</strong> For displaying advertisements. <a href="https://support.google.com/admob/answer/6128543" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li><strong>OneSignal:</strong> For sending push notifications. <a href="https://onesignal.com/privacy_policy" className="text-primary hover:underline">Privacy Policy</a></li>
                  <li><strong>Other Third-Party SDKs:</strong> The App may also use other third-party SDKs for various purposes.</li>
                </ul>
                <p className="text-muted-foreground">
                  We encourage you to review the privacy policies of these and any other third-party services to understand their practices.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  4. Data Security
                </h2>
                <p className="text-muted-foreground">
                  We are committed to protecting your information. While we strive to use commercially acceptable means to protect your data, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee its absolute security.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  5. Children's Privacy
                </h2>
                <p className="text-muted-foreground">
                  The App is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without verification of parental consent, we will take steps to remove that information from our servers.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  6. Changes to This Privacy Policy
                </h2>
                <p className="text-muted-foreground">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  7. Contact Us
                </h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, you can contact us at:
                </p>
                <div className="pl-6 space-y-1 text-muted-foreground">
                  <p><strong>Email:</strong> <a href="mailto:aktennis9@gmail.com" className="text-primary hover:underline">aktennis9@gmail.com</a></p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
