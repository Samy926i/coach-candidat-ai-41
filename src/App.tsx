import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import JobContext from "./pages/JobContext";
import Interview from "./pages/Interview";
import SessionDetail from "./pages/SessionDetail";
import CVAnalysis from "./pages/CVAnalysis";
import Settings from "./pages/Settings";
import Research from "./pages/Research";
import NotFound from "./pages/NotFound";
import OnboardingStep1 from "./pages/onboarding/Step1";
import OnboardingStep2 from "./pages/onboarding/Step2";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/research" element={<Research />} />
          <Route path="/job-context" element={<JobContext />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/cv-analysis" element={<CVAnalysis />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding/1" element={<OnboardingStep1 />} />
          <Route path="/onboarding/2" element={<OnboardingStep2 />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
