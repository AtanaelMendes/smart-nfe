import { cn } from "@/assets/utils";

function Skeleton({ className, ...props }) {
    return <div className={cn("animate-pulse rounded-md bg-gray-300", className)} {...props} />;
}

function FormSkeleton({ className, ...props }) {
    return (
        <div className={cn("h-screen w-full flex flex-col bg-gray-50", className)} {...props}>
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
                <Skeleton className="h-8 w-48" />
                <div className="ml-auto">
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Title Section */}
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* Field 1 */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            {/* Field 2 */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            {/* Field 3 */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            {/* Field 4 - Select */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Field 5 */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            {/* Field 6 */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            {/* Field 7 - Textarea */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </div>
                    </div>

                    {/* Full Width Section */}
                    <div className="space-y-6">
                        {/* Large Text Area */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-32 w-full" />
                        </div>

                        {/* Checkbox Group */}
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                        <Skeleton className="h-10 w-full sm:w-32" />
                        <Skeleton className="h-10 w-full sm:w-28" />
                        <div className="sm:ml-auto">
                            <Skeleton className="h-10 w-full sm:w-24" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SkeletonList({ className, count, variant = "default" }) {
    if (variant === "cards") {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        {/* Card Header */}
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <div className="flex space-x-2">
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === "table") {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
                {/* Table Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-gray-200">
                    {Array.from({ length: count }).map((_, index) => (
                        <div key={index} className="px-6 py-4">
                            <div className="grid grid-cols-4 gap-4 items-center">
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-20" />
                                <div className="flex items-center space-x-2">
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <div className="flex space-x-2">
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default variant - enhanced list items
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                            {/* Avatar/Icon */}
                            <Skeleton className="h-12 w-12 rounded-full" />

                            {/* Content */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-64" />
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export { Skeleton, FormSkeleton, SkeletonList };
