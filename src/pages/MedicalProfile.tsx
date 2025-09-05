import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ArrowLeft, Download, FileText, Edit3, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const MedicalProfile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    fullName: "",
    dateOfBirth: "",
    bloodType: "",
    height: "",
    weight: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    medicalConditions: "",
    currentMedications: "",
    allergies: "",
    pastSurgeries: "",
    healthcareProviders: "",
    insuranceInfo: "",
    vaccinationHistory: ""
  });

  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [editingAiHistory, setEditingAiHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    // Load saved profile with user ID key
    const savedProfile = localStorage.getItem(`clearvisit_profile_${user.id}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }

    // Load AI-generated history from Supabase
    loadAIHistory();
  }, [user, navigate]);

  const loadAIHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_generated_history')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading AI history:', error);
        return;
      }

      if (data?.ai_generated_history) {
        setAiHistory(Array.isArray(data.ai_generated_history) ? data.ai_generated_history : []);
      }
    } catch (error) {
      console.error('Error loading AI history:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleSave = () => {
    if (!user) return;
    localStorage.setItem(`clearvisit_profile_${user.id}`, JSON.stringify(profile));
    toast({
      title: "Profile saved",
      description: "Your medical profile has been updated successfully",
    });
  };

  const handleClearAll = () => {
    setProfile({
      fullName: "",
      dateOfBirth: "",
      bloodType: "",
      height: "",
      weight: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      medicalConditions: "",
      currentMedications: "",
      allergies: "",
      pastSurgeries: "",
      healthcareProviders: "",
      insuranceInfo: "",
      vaccinationHistory: ""
    });
  };

  const handleDownloadPDF = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf-handoff', {
        body: { 
          userId: user.id, 
          manualProfile: profile 
        }
      });

      if (error) throw error;

      // Create a new window to display the PDF content
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        // Auto-trigger print dialog
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast({
        title: "PDF Generated",
        description: "Your medical handoff sheet is ready for download",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAIHistory = async (newHistory: any[]) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_generated_history: newHistory })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setAiHistory(newHistory);
      toast({
        title: "AI History Updated",
        description: "Your medical history has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating AI history:', error);
      toast({
        title: "Error",
        description: "Failed to update AI history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Medical Profile</h1>
          <div className="ml-auto">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="mr-2"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* AI-Generated Medical History */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                AI-Generated Medical History
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Automatically updated from your doctor visits. You can review and edit this information.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {aiHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {aiHistory.length} medical entries from past visits
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAiHistory(!editingAiHistory)}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      {editingAiHistory ? 'View Mode' : 'Edit Mode'}
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {aiHistory.slice().reverse().map((entry, index) => (
                      <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-blue-700">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          {entry.medications?.new?.length > 0 && (
                            <div>
                              <strong className="text-green-700">New Medications:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {entry.medications.new.map((med: string, i: number) => (
                                  <li key={i}>{med}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {entry.symptoms?.length > 0 && (
                            <div>
                              <strong className="text-orange-700">Symptoms:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {entry.symptoms.map((symptom: string, i: number) => (
                                  <li key={i}>{symptom}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {entry.diagnoses?.length > 0 && (
                            <div>
                              <strong className="text-red-700">Diagnoses:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {entry.diagnoses.map((diagnosis: string, i: number) => (
                                  <li key={i}>{diagnosis}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {entry.recommendations?.length > 0 && (
                            <div>
                              <strong className="text-purple-700">Recommendations:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {entry.recommendations.map((rec: string, i: number) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No AI-generated medical history yet.</p>
                  <p className="text-sm">Complete a doctor visit to see automated medical insights here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDF Download Card */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Medical Handoff Sheet
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Generate a professional PDF for your doctor with all your medical information.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Doctor Handoff Sheet</p>
                  <p className="text-sm text-gray-600">
                    Includes manual profile data + AI-generated medical history
                  </p>
                </div>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {loading ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-800">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Physical Information */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-800">Physical Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="bloodType">Blood Type</Label>
                <Select value={profile.bloodType} onValueChange={(value) => handleChange("bloodType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  value={profile.height}
                  onChange={(e) => handleChange("height", e.target.value)}
                  placeholder="Enter your height"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={profile.weight}
                  onChange={(e) => handleChange("weight", e.target.value)}
                  placeholder="Enter your weight"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-800">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={profile.emergencyContactName}
                  onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                <Input
                  id="emergencyContactPhone"
                  value={profile.emergencyContactPhone}
                  onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelation">Relationship</Label>
                <Input
                  id="emergencyContactRelation"
                  value={profile.emergencyContactRelation}
                  onChange={(e) => handleChange("emergencyContactRelation", e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-yellow-800">Medical History</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Textarea
                  id="medicalConditions"
                  value={profile.medicalConditions}
                  onChange={(e) => handleChange("medicalConditions", e.target.value)}
                  placeholder="List any medical conditions"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentMedications">Current Medications</Label>
                <Textarea
                  id="currentMedications"
                  value={profile.currentMedications}
                  onChange={(e) => handleChange("currentMedications", e.target.value)}
                  placeholder="List current medications"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={profile.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                  placeholder="List any allergies"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pastSurgeries">Past Surgeries / Major Illnesses</Label>
                <Textarea
                  id="pastSurgeries"
                  value={profile.pastSurgeries}
                  onChange={(e) => handleChange("pastSurgeries", e.target.value)}
                  placeholder="List any past surgeries or major illnesses"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Healthcare & Insurance */}
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-800">Healthcare & Insurance</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="healthcareProviders">Healthcare Providers</Label>
                <Textarea
                  id="healthcareProviders"
                  value={profile.healthcareProviders}
                  onChange={(e) => handleChange("healthcareProviders", e.target.value)}
                  placeholder="List your healthcare providers"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceInfo">Insurance Information</Label>
                <Textarea
                  id="insuranceInfo"
                  value={profile.insuranceInfo}
                  onChange={(e) => handleChange("insuranceInfo", e.target.value)}
                  placeholder="Enter insurance information"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vaccination History */}
          <Card>
            <CardHeader className="bg-indigo-50">
              <CardTitle className="text-indigo-800">Vaccination History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="vaccinationHistory">Vaccination History</Label>
                <Textarea
                  id="vaccinationHistory"
                  value={profile.vaccinationHistory}
                  onChange={(e) => handleChange("vaccinationHistory", e.target.value)}
                  placeholder="List your vaccination history"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={handleClearAll}>
              Clear All Fields
            </Button>
            <Button onClick={handleSave} className="ml-auto">
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalProfile;