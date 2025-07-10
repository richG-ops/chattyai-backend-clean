'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Calendar, BarChart3, Users, CheckCircle, Star, Sparkles, Zap, Shield } from "lucide-react"
import Link from "next/link"
import { ConfettiEffect } from "@/components/ui/confetti"

export default function Home() {
  const [showConfetti, setShowConfetti] = useState(false)

  const handleGetStartedClick = () => {
    setShowConfetti(true)
    // Small delay before navigation for confetti effect
    setTimeout(() => {
      window.location.href = '/ai-employee-selection'
    }, 800)
  }

  return (
    <div className="min-h-screen bg-hero-gradient scroll-smooth">
      <ConfettiEffect 
        isActive={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center justify-between animate-slideInLeft">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TheChattyAI</span>
          </div>
          <Link href="/login">
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white hover:text-blue-600 transition-all duration-300">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6 animate-fadeInUp border border-white/20">
            <Star className="w-4 h-4 mr-2" />
            Trusted by 500+ businesses
            <Sparkles className="w-4 h-4 ml-2 animate-pulse" />
          </div>
          
          <h1 className="text-hero mb-6 leading-tight animate-fadeInUp float">
            AI Voice Agents for Your{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Business
            </span>
          </h1>
          
          <p className="text-subhero mb-8 max-w-2xl mx-auto animate-fadeInUp opacity-90">
            Never miss another appointment. Our AI handles calls, books appointments, 
            and manages your calendar 24/7 so you can focus on what matters.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fadeInUp">
                          <Button 
                size="lg" 
                className="text-lg px-8 py-6 btn-premium bg-white text-blue-600 hover:bg-gray-50 shadow-2xl"
                onClick={handleGetStartedClick}
              >
                <Zap className="w-5 h-5 mr-2" />
                Hire Your AI Team
              </Button>
            <Link href="/demo">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 btn-premium bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white hover:text-blue-600"
              >
                <Phone className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center justify-center space-x-8 text-sm text-blue-100 animate-fadeInUp">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              Free 14-day trial
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              Setup in 5 minutes
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need to automate your business
            </h2>
            <p className="text-xl text-blue-100">
              Professional AI voice agents that work around the clock
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-2xl card-hover bg-white/95 backdrop-blur-sm animate-slideInLeft">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Smart Call Handling</CardTitle>
                <CardDescription>
                  AI answers calls professionally, understands context, and handles complex conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Natural voice conversations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Multi-language support
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    24/7 availability
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl card-hover bg-white/95 backdrop-blur-sm animate-fadeInUp">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Auto Scheduling</CardTitle>
                <CardDescription>
                  Seamlessly integrates with your calendar to book appointments instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Real-time availability
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Automatic confirmations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Conflict prevention
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl card-hover bg-white/95 backdrop-blur-sm animate-slideInRight">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Smart Analytics</CardTitle>
                <CardDescription>
                  Get insights into your business performance with detailed analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Call performance metrics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Booking conversion rates
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Revenue tracking
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12 animate-fadeInUp">
            Trusted by businesses worldwide
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-2xl card-hover bg-white/95 backdrop-blur-sm animate-slideInLeft">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "TheChattyAI transformed our booking process. We went from missing 30% of calls to capturing every opportunity. Revenue increased 45% in just 3 months."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SJ</span>
                  </div>
                  <div>
                    <p className="font-semibold">Sarah Johnson</p>
                    <p className="text-sm text-gray-500">Salon Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl card-hover bg-white/95 backdrop-blur-sm animate-fadeInUp">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "The AI handles our appointment scheduling flawlessly. Our patients love the 24/7 availability, and we've reduced no-shows by 60%."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">MC</span>
                  </div>
                  <div>
                    <p className="font-semibold">Dr. Michael Chen</p>
                    <p className="text-sm text-gray-500">Medical Practice</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl card-hover bg-white/95 backdrop-blur-sm animate-slideInRight">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "Game changer for our fitness studio. The AI books classes, handles cancellations, and even upsells memberships. It's like having a full-time receptionist."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ER</span>
                  </div>
                  <div>
                    <p className="font-semibold">Emma Rodriguez</p>
                    <p className="text-sm text-gray-500">Fitness Studio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fadeInUp">
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm card-hover">
            <CardContent className="p-12">
              <div className="flex justify-center mb-6">
                <Shield className="w-16 h-16 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ready to automate your business?
              </h2>
              <p className="text-xl mb-8 text-gray-600">
                Join thousands of businesses using AI to grow their revenue
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 btn-premium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-2xl"
                  onClick={handleGetStartedClick}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Free Trial
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 btn-premium border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm text-white py-12 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="animate-fadeInUp">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold">TheChattyAI</span>
              </div>
              <p className="text-blue-100">
                AI Voice Agents for Your Business
              </p>
            </div>
            
            <div className="animate-slideInLeft">
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div className="animate-fadeInUp">
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Updates</a></li>
              </ul>
            </div>
            
            <div className="animate-slideInRight">
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-12 pt-8 text-center text-blue-200">
            <p>&copy; 2025 TheChattyAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 