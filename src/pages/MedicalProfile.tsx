import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MedicalProfile = () => {
  const [user, setUser] = useState<string | null>(null);
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
    medicalConditions: "",
    currentMedications: "",
    allergies: "",
    pastSurgeries: "",
    healthcareProviders: "",
    insuranceInfo: "",
    vaccinationHistory: ""
  });

  useEffect(() => {
    const currentUser = localStorage.getItem("clearvisit_user");
    if (!currentUser) {
      navigate("/");
      return;
    }
    setUser(currentUser);

    // Load saved profile
    const savedProfile = localStorage.getItem("clearvisit_profile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("clearvisit_user");
    navigate("/");
  };

  const handleSave = () => {
    localStorage.setItem("clearvisit_profile", JSON.stringify(profile));
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
      medicalConditions: "",
      currentMedications: "",
      allergies: "",
      pastSurgeries: "",
      healthcareProviders: "",
      insuranceInfo: "",
      vaccinationHistory: ""
    });
  };

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user || undefined} onLogout={handleLogout} />
      
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
                  placeholder="Adarsh Karthik"
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
                  placeholder="5.10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={profile.weight}
                  onChange={(e) => handleChange("weight", e.target.value)}
                  placeholder="165"
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
                  placeholder="Karthik Thilairangan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                <Input
                  id="emergencyContactPhone"
                  value={profile.emergencyContactPhone}
                  onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                  placeholder="813-928-8075"
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
                  placeholder="dysplasia, chronic GI issues"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentMedications">Current Medications</Label>
                <Textarea
                  id="currentMedications"
                  value={profile.currentMedications}
                  onChange={(e) => handleChange("currentMedications", e.target.value)}
                  placeholder="nexium"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={profile.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                  placeholder="none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pastSurgeries">Past Surgeries / Major Illnesses</Label>
                <Textarea
                  id="pastSurgeries"
                  value={profile.pastSurgeries}
                  onChange={(e) => handleChange("pastSurgeries", e.target.value)}
                  placeholder="endoscopy"
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
                  placeholder="Dr. Tan"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceInfo">Insurance Information</Label>
                <Textarea
                  id="insuranceInfo"
                  value={profile.insuranceInfo}
                  onChange={(e) => handleChange("insuranceInfo", e.target.value)}
                  placeholder="----------"
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
                  placeholder="Covid, Flu, etc. - all vaccines up to date"
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