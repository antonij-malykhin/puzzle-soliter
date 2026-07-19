/**
 * PerformanceMonitor
 * 
 * Simple performance monitoring for MVP testing.
 * Tracks frame timing, critical path execution times, and memory usage.
 * 
 * Use cases:
 * - Measure drag/drop latency
 * - Track piece placement validation time
 * - Monitor memory growth across level replays
 * - Identify performance hotspots
 */
export class PerformanceMonitor {
    private static readonly markers = new Map<string, number>();
    private static readonly measurements = new Map<string, number[]>();
    private static enabled = true;

    /** Enable/disable monitoring */
    public static setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /** Start timing a named operation */
    public static mark(label: string): void {
        if (!this.enabled) {
            return;
        }
        this.markers.set(label, performance.now());
    }

    /** End timing and record measurement */
    public static measure(label: string, startLabel?: string): number {
        if (!this.enabled) {
            return 0;
        }

        const endTime = performance.now();
        const startTime = startLabel ? this.markers.get(startLabel) : this.markers.get(label);

        if (!startTime) {
            console.warn(`[PerformanceMonitor] No start time found for: ${label}`);
            return 0;
        }

        const duration = endTime - startTime;
        if (!this.measurements.has(label)) {
            this.measurements.set(label, []);
        }
        this.measurements.get(label)!.push(duration);

        return duration;
    }

    /** Log all measurements */
    public static report(): void {
        if (!this.enabled) {
            return;
        }

        console.group('[PerformanceMonitor] Timing Report');
        this.measurements.forEach((durations, label) => {
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const min = Math.min(...durations);
            const max = Math.max(...durations);
            console.log(`${label}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, count=${durations.length}`);
        });
        console.groupEnd();
    }

    /** Clear all measurements */
    public static clear(): void {
        this.markers.clear();
        this.measurements.clear();
    }

    /** Get memory usage stats (if available) */
    public static getMemoryStats(): { usedJSHeapSize: number; jsHeapSizeLimit: number; jsHeapSizeRatio: number } | null {
        if (!(performance as any).memory) {
            return null;
        }

        const memory = (performance as any).memory;
        return {
            usedJSHeapSize: memory.usedJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            jsHeapSizeRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        };
    }

    /** Log memory stats */
    public static reportMemory(): void {
        const stats = this.getMemoryStats();
        if (!stats) {
            console.log('[PerformanceMonitor] Memory stats unavailable');
            return;
        }

        console.log(
            `[PerformanceMonitor] Memory: ${(stats.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(stats.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB (${(stats.jsHeapSizeRatio * 100).toFixed(1)}%)`,
        );
    }
}
