import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileFeatures } from "@/hooks/useMobileFeatures";
import { ImpactStyle } from "@capacitor/haptics";

const MedicalProfile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { triggerHaptic } = useMobileFeatures();

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
    if (!user) {
      navigate("/");
      return;
    }

    // Load saved profile with user ID key
    const savedProfile = localStorage.getItem(`clearvisit_profile_${user.id}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await signOut();
  };

  const handleSave = () => {
    if (!user) return;
    triggerHaptic(ImpactStyle.Light);
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
      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6" />
              <span className="text-xl font-semibold">ClearVisit AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader 
          title="Medical Profile" 
          showBackButton 
          backPath="/dashboard"
        />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 md:pb-8">
        {/* Desktop Back Button */}
        <div className="hidden md:flex items-center gap-4 mb-8">
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
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-800 text-lg md:text-xl">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
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
              <CardTitle className="text-green-800 text-lg md:text-xl">Physical Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
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
              <CardTitle className="text-red-800 text-lg md:text-xl">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
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
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-yellow-800 text-lg md:text-xl">Medical History</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
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
              <CardTitle className="text-purple-800 text-lg md:text-xl">Healthcare & Insurance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
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
              <CardTitle className="text-indigo-800 text-lg md:text-xl">Vaccination History</CardTitle>
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
          <div className="flex flex-col md:flex-row gap-3 pt-6">
            <Button variant="outline" onClick={handleClearAll}>
              Clear All Fields
            </Button>
            <Button onClick={handleSave} className="md:ml-auto">
              Save Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default MedicalProfile;