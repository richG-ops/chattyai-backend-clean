import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, Phone, Calendar, Settings, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function SetupCompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Animation */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Your AI Assistant is Being Created!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're setting up your personalized AI voice agent. You'll be up and running in no time!
          </p>
        </div>

        {/* Progress Timeline */}
        <div className="mb-12">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Setup Progress</CardTitle>
              <CardDescription className="text-center">
                Your AI assistant is being configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800">Account Created</h3>
                    <p className="text-sm text-gray-600">Your business profile has been set up</p>
                  </div>
                  <div className="text-green-600 text-sm font-medium">Complete</div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                    <Settings className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800">Building Voice Agent</h3>
                    <p className="text-sm text-gray-600">Customizing AI for your business type</p>
                  </div>
                  <div className="text-blue-600 text-sm font-medium">In Progress</div>
                </div>

                {/* Step 3 */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-600">Phone Number Assignment</h3>
                    <p className="text-sm text-gray-600">Dedicated number for your business</p>
                  </div>
                  <div className="text-gray-500 text-sm font-medium">Pending</div>
                </div>

                {/* Step 4 */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-600">Calendar Integration</h3>
                    <p className="text-sm text-gray-600">Connect your Google Calendar</p>
                  </div>
                  <div className="text-gray-500 text-sm font-medium">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estimated Time */}
        <div className="text-center mb-12">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Estimated Time</h2>
              </div>
              <div className="text-4xl font-bold text-blue-600 mb-2">30 minutes</div>
              <p className="text-gray-600">We'll send you an email when everything is ready</p>
            </CardContent>
          </Card>
        </div>

        {/* What's Next */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-green-600" />
                Connect Calendar
              </CardTitle>
              <CardDescription>
                Link your Google Calendar for seamless scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Automatic appointment booking</li>
                <li>• Real-time availability checking</li>
                <li>• Conflict prevention</li>
                <li>• Instant confirmations</li>
              </ul>
              <Button className="w-full" disabled>
                <Calendar className="w-4 h-4 mr-2" />
                Ready Soon
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-600" />
                Voice Settings
              </CardTitle>
              <CardDescription>
                Customize your AI assistant's voice and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Choose voice type and accent</li>
                <li>• Set greeting messages</li>
                <li>• Configure business hours</li>
                <li>• Add custom responses</li>
              </ul>
              <Button className="w-full" disabled>
                <Settings className="w-4 h-4 mr-2" />
                Ready Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* What You'll Get */}
        <Card className="border-0 shadow-lg mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">What You'll Get</CardTitle>
            <CardDescription>
              Everything you need to automate your business communication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Dedicated Phone Number</h3>
                <p className="text-sm text-gray-600">Your own business number that forwards to AI</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Calendar Integration</h3>
                <p className="text-sm text-gray-600">Seamless booking directly to your schedule</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Management Dashboard</h3>
                <p className="text-sm text-gray-600">Monitor calls, bookings, and performance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-blue-50">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Questions? We're Here to Help
            </h2>
            <p className="text-gray-600 mb-6">
              Our team is standing by to ensure your setup goes smoothly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                <Phone className="w-4 h-4 mr-2" />
                Call Support
              </Button>
              <Button variant="outline" size="lg">
                <ArrowRight className="w-4 h-4 mr-2" />
                Live Chat
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>&copy; 2025 TheChattyAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
} 