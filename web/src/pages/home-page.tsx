import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Code2,
  MessageSquare,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthQuery, useLogin } from "@/hooks/use-auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React from "react";
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {
  const { login, isLoading } = useLogin();
  const { data: user } = useAuthQuery();
  const navigate = useNavigate();

  const isAdmin = user?.roles?.some((role) =>
    role.name.toLowerCase().includes("admin"),
  );

  const handleDashboardClick = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const features = [
    {
      icon: <Code2 className="h-8 w-8" />,
      title: "Structured Learning",
      description:
        "Practice DSA with organized assignments and real-world problem solving",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Peer Reviews",
      description:
        "Learn from others and improve through collaborative code reviews",
    },
    {
      icon: <Trophy className="h-8 w-8" />,
      title: "Achievement System",
      description:
        "Earn roles and recognition as you master different DSA concepts",
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Discord Integration",
      description:
        "Seamless experience with Discord server events and notifications",
    },
  ] as const;

  const benefits = [
    "Join scheduled learning events with expert guidance",
    "Submit and review code with detailed feedback",
    "Track your progress with achievement badges",
    "Connect with like-minded DSA learners",
    "Access to exclusive Discord channels and resources",
  ] as const;

  const renderActionButton = () => {
    if (user) {
      return (
        <Button
          onClick={handleDashboardClick}
          size="lg"
          className={`${
            isAdmin
              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105`}
        >
          {isAdmin ? "Go to Admin Dashboard" : "Go to Dashboard"}
          {isAdmin ? (
            <Settings className="ml-3 h-5 w-5" />
          ) : (
            <ArrowRight className="ml-3 h-5 w-5" />
          )}
        </Button>
      );
    }

    return (
      <Button
        onClick={login}
        disabled={isLoading}
        size="lg"
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 disabled:transform-none"
      >
        {isLoading ? "Redirecting..." : "Join DSA Doers"}
        <ArrowRight className="ml-3 h-5 w-5" />
      </Button>
    );
  };

  const renderCTAButton = () => {
    if (user) {
      return (
        <Button
          onClick={handleDashboardClick}
          size="lg"
          className={`${
            isAdmin
              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          } text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105`}
        >
          {isAdmin ? "Access Admin Panel" : "Continue Learning"}
          {isAdmin ? (
            <Settings className="ml-3 h-5 w-5" />
          ) : (
            <ArrowRight className="ml-3 h-5 w-5" />
          )}
        </Button>
      );
    }

    return (
      <Button
        onClick={login}
        disabled={isLoading}
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
      >
        Get Started Now
        <ArrowRight className="ml-3 h-5 w-5" />
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              🚀 Learn • Practice • Master
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              DSA
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {" "}
                Doers
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              Master Data Structures & Algorithms through structured learning,
              peer collaboration, and hands-on practice in our Discord
              community.
            </p>

            {renderActionButton()}

            <p className="text-sm text-slate-400 mt-4">
              {user
                ? `Welcome back, ${user?.discordUsername}!`
                : "Authenticate with Discord • Free to join • Start learning today"}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose DSA Doers?
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Experience a comprehensive learning platform designed for serious
              DSA learners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors"
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-blue-600/20 rounded-xl w-fit">
                    <div className="text-blue-400">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-white text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-300 text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-800/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                What You'll Get
              </h2>
              <p className="text-xl text-slate-300">
                Join a community of dedicated learners and accelerate your DSA
                journey
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                  <p className="text-slate-300 text-lg">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-12 border border-slate-700">
            <BookOpen className="h-16 w-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              {user
                ? isAdmin
                  ? "Manage Your Community"
                  : "Continue Your DSA Journey"
                : "Ready to Level Up Your DSA Skills?"}
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              {user
                ? isAdmin
                  ? "Access admin tools and manage the DSA Doers community."
                  : "Continue learning with structured practice and peer collaboration."
                : "Join hundreds of learners mastering algorithms through structured practice and peer collaboration."}
            </p>
            {renderCTAButton()}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400">
            © 2024 DSA Doers. Built for learners, by learners.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
