import { MessagingContainer } from "@/components/messaging";

/**
 * Test page for MessagingContainer responsive behavior and animations
 * This page allows manual testing of the enhanced messaging container
 */
export default function MessagingContainerTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Messaging Container Test</h1>
          <p className="text-muted-foreground">
            Test the enhanced messaging container with responsive layout, animations, and error handling.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Responsive layout (mobile/desktop)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Framer Motion animations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Error boundaries and loading states</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Smooth transitions and interactions</span>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h2 className="font-semibold mb-2">Test Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Resize your browser window to test responsive behavior</li>
            <li>On mobile view, select a conversation to see slide animations</li>
            <li>Use the back button on mobile to return to conversation list</li>
            <li>Test error states by temporarily disconnecting network</li>
            <li>Observe smooth animations and loading states</li>
          </ol>
        </div>

        {/* Messaging Container */}
        <div className="h-[600px] border rounded-lg overflow-hidden">
          <MessagingContainer />
        </div>

        {/* Responsive Test Indicators */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="md:hidden px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
            📱 Mobile View
          </div>
          <div className="hidden md:block px-3 py-1 bg-green-100 text-green-800 rounded-full">
            🖥️ Desktop View
          </div>
        </div>
      </div>
    </div>
  );
}