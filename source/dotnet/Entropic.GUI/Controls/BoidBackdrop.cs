using System;
using System.Collections.Generic;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.Threading;

namespace Entropic.GUI.Controls;

// @must_test(REQ-GUI-012)
/// Full boid flocking system ported from TypeScript BoidSystem.tsx + AnimatedBackground.tsx.
/// Ornstein-Uhlenbeck stochastic parameter variation, logo bounce, spawn/detach lifecycle.
public class BoidBackdrop : Control
{
    // --- Config (matching TypeScript boids/config.ts) ---
    private const int MaxBoids = 10;
    private const double MinBoidSize = 6;
    private const double MaxBoidSize = 10;
    private const double BaseSpeed = 0.5;
    private const double MaxBoidOpacity = 0.18;

    private const double AlignmentRadius = 150;
    private const double CohesionRadius = 100;
    private const double SeparationRadius = 50;
    private const double EdgeMargin = 100;

    // Logo
    private const double LogoRadius = 100;
    private const double LogoDetectionRadius = 120;
    private const double LogoBounceForce = 0.15;
    private const double LogoOpacity = 0.10;

    // Spawn/detach probabilities
    private const double SpawnProbBase = 1.0;
    private const double SpawnProbDecay = 0.15;
    private const double DetachProbMax = 0.02;
    private const double DetachProbScale = 0.002;

    // --- Stochastic parameters (Ornstein-Uhlenbeck) ---
    private double _alignForce = 0.05;
    private double _cohForce = 0.03;
    private double _sepForce = 0.1;
    private double _wanderForce = 0.02;
    private double _edgeTurnForce = 0.05;

    private const double BaseAlignForce = 0.05;
    private const double BaseCohForce = 0.03;
    private const double BaseSepForce = 0.1;
    private const double BaseWanderForce = 0.02;
    private const double MeanReversionRate = 0.01;
    private const double Volatility = 0.02;

    private readonly List<Boid> _boids = new();
    private readonly Random _rng = new();
    private DispatcherTimer? _timer;
    private double _elapsed;
    private double _logoThrobSpeed = 4.0;
    private double _logoRotation;
    private double _logoRotationSpeed = 30.0;

    public BoidBackdrop()
    {
        IsHitTestVisible = false;
        ClipToBounds = true;
    }

    protected override void OnAttachedToVisualTree(VisualTreeAttachmentEventArgs e)
    {
        base.OnAttachedToVisualTree(e);
        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(16) };
        _timer.Tick += OnTick;
        _timer.Start();
    }

    protected override void OnDetachedFromVisualTree(VisualTreeAttachmentEventArgs e)
    {
        _timer?.Stop();
        _timer = null;
        base.OnDetachedFromVisualTree(e);
    }

    private void OnTick(object? sender, EventArgs e)
    {
        const double dt = 0.016;
        _elapsed += dt;
        var w = Bounds.Width;
        var h = Bounds.Height;
        if (w < 10 || h < 10) return;

        UpdateStochasticParams();
        UpdateLogoSpeeds();

        _logoRotation += (dt / _logoRotationSpeed) * 360.0;

        // Spawn with probability-based lifecycle
        double spawnProb = SpawnProbBase * Math.Exp(-SpawnProbDecay * _boids.Count) / 60.0;
        if (_boids.Count < MaxBoids && _rng.NextDouble() < spawnProb)
            SpawnBoid(w, h);

        var cx = w / 2;
        var cy = h / 2;
        var toRemove = new List<int>();

        for (int i = 0; i < _boids.Count; i++)
        {
            var b = _boids[i];

            // Throb and rotation
            b.ThrobPhase += b.ThrobSpeed;
            b.Rotation += b.RotationSpeed;
            if (_rng.NextDouble() < 0.005)
                b.RotationSpeed = (_rng.NextDouble() - 0.5) * 2;

            // Enter/leave lifecycle
            if (b.Entering)
            {
                b.Opacity = Math.Min(MaxBoidOpacity, b.Opacity + 0.0003);
                if (b.Opacity >= MaxBoidOpacity) b.Entering = false;
            }
            else if (b.Leaving)
            {
                b.Opacity = Math.Max(0, b.Opacity - 0.0003);
                if (b.Opacity <= 0) { toRemove.Add(i); continue; }
                b.X += b.Vx * 2;
                b.Y += b.Vy * 2;
                continue;
            }
            else
            {
                // Detach check
                double detachProb = Math.Min(DetachProbMax, _boids.Count * DetachProbScale) / 60.0;
                if (_rng.NextDouble() < detachProb)
                    b.Leaving = true;
            }

            // Logo bounce
            var ldx = b.X - cx;
            var ldy = b.Y - cy;
            var ldist = Math.Sqrt(ldx * ldx + ldy * ldy);
            if (ldist < LogoDetectionRadius && ldist > 0.01)
            {
                var fx = (ldx / ldist) * LogoBounceForce * (0.8 + _rng.NextDouble() * 0.4);
                var fy = (ldy / ldist) * LogoBounceForce * (0.8 + _rng.NextDouble() * 0.4);
                b.Vx += fx;
                b.Vy += fy;
                if (_rng.NextDouble() < 0.3)
                    b.RotationSpeed = (_rng.NextDouble() - 0.5) * 4;
            }

            ApplyFlocking(b, i);
            ApplyEdgeAvoidance(b, w, h);
            ApplyWander(b);

            b.Vx = Clamp(b.Vx + b.Ax, -BaseSpeed * 2, BaseSpeed * 2);
            b.Vy = Clamp(b.Vy + b.Ay, -BaseSpeed * 2, BaseSpeed * 2);

            var speed = Math.Sqrt(b.Vx * b.Vx + b.Vy * b.Vy);
            if (speed > BaseSpeed * 2)
            {
                b.Vx = b.Vx / speed * BaseSpeed * 2;
                b.Vy = b.Vy / speed * BaseSpeed * 2;
            }

            b.X += b.Vx;
            b.Y += b.Vy;
            b.Ax = 0;
            b.Ay = 0;

            // Remove if far off screen
            if (b.X < -200 || b.X > w + 200 || b.Y < -200 || b.Y > h + 200)
                toRemove.Add(i);
        }

        for (int i = toRemove.Count - 1; i >= 0; i--)
            _boids.RemoveAt(toRemove[i]);

        InvalidateVisual();
    }

    private void UpdateStochasticParams()
    {
        // Ornstein-Uhlenbeck process for mean reversion
        _alignForce = OUStep(_alignForce, BaseAlignForce);
        _cohForce = OUStep(_cohForce, BaseCohForce);
        _sepForce = OUStep(_sepForce, BaseSepForce);
        _wanderForce = OUStep(_wanderForce, BaseWanderForce);

        // Occasional larger jumps (0.5% chance)
        if (_rng.NextDouble() < 0.005)
        {
            switch (_rng.Next(4))
            {
                case 0: _alignForce = BaseAlignForce * (0.5 + _rng.NextDouble() * 1.5); break;
                case 1: _cohForce = BaseCohForce * (0.5 + _rng.NextDouble() * 1.5); break;
                case 2: _sepForce = BaseSepForce * (0.5 + _rng.NextDouble() * 1.5); break;
                case 3: _wanderForce = BaseWanderForce * (0.5 + _rng.NextDouble() * 1.5); break;
            }
        }
    }

    private double OUStep(double current, double baseVal)
    {
        var drift = MeanReversionRate * (baseVal - current);
        var diffusion = Volatility * baseVal * (_rng.NextDouble() - 0.5) * 2;
        return Math.Max(0, current + drift + diffusion);
    }

    private void UpdateLogoSpeeds()
    {
        // Stochastic throb speed (log-normal, 2% chance per second ~= 0.03% per frame)
        if (_rng.NextDouble() < 0.0003)
        {
            var normal = (_rng.NextDouble() - 0.5) * 2 * 0.3 + 1.2;
            _logoThrobSpeed = Clamp(Math.Exp(normal), 1, 10);
        }
        // Stochastic rotation speed (normal distribution)
        if (_rng.NextDouble() < 0.0003)
        {
            _logoRotationSpeed = Clamp(Math.Abs(BoxMullerNormal(20, 10)), 5, 60);
        }
    }

    private double BoxMullerNormal(double mean, double stdDev)
    {
        var u1 = _rng.NextDouble();
        var u2 = _rng.NextDouble();
        var z0 = Math.Sqrt(-2 * Math.Log(u1)) * Math.Cos(2 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    private void SpawnBoid(double w, double h)
    {
        var edge = _rng.Next(4);
        double x, y, vx, vy;
        switch (edge)
        {
            case 0: x = _rng.NextDouble() * w; y = -50; vx = (_rng.NextDouble() - 0.5) * 2; vy = 1 + _rng.NextDouble(); break;
            case 1: x = w + 50; y = _rng.NextDouble() * h; vx = -(1 + _rng.NextDouble()); vy = (_rng.NextDouble() - 0.5) * 2; break;
            case 2: x = _rng.NextDouble() * w; y = h + 50; vx = (_rng.NextDouble() - 0.5) * 2; vy = -(1 + _rng.NextDouble()); break;
            default: x = -50; y = _rng.NextDouble() * h; vx = 1 + _rng.NextDouble(); vy = (_rng.NextDouble() - 0.5) * 2; break;
        }
        _boids.Add(new Boid
        {
            X = x, Y = y,
            Vx = vx * BaseSpeed, Vy = vy * BaseSpeed,
            Size = MinBoidSize + _rng.NextDouble() * (MaxBoidSize - MinBoidSize),
            Rotation = _rng.NextDouble() * 360,
            RotationSpeed = (_rng.NextDouble() - 0.5) * 2,
            ThrobPhase = _rng.NextDouble() * Math.PI * 2,
            ThrobSpeed = 0.02 + _rng.NextDouble() * 0.02,
            Opacity = 0,
            Entering = true,
        });
    }

    private void ApplyFlocking(Boid b, int idx)
    {
        double alignX = 0, alignY = 0, alignCount = 0;
        double cohX = 0, cohY = 0, cohCount = 0;
        double sepX = 0, sepY = 0;

        for (int j = 0; j < _boids.Count; j++)
        {
            if (j == idx) continue;
            var other = _boids[j];
            if (other.Leaving) continue;
            var dx = other.X - b.X;
            var dy = other.Y - b.Y;
            var dist = Math.Sqrt(dx * dx + dy * dy);

            if (dist < AlignmentRadius && dist > 0.01)
            { alignX += other.Vx; alignY += other.Vy; alignCount++; }
            if (dist < CohesionRadius && dist > 0.01)
            { cohX += other.X; cohY += other.Y; cohCount++; }
            if (dist < SeparationRadius && dist > 0.01)
            {
                var diff = SeparationRadius - dist;
                sepX += (b.X - other.X) / dist * diff;
                sepY += (b.Y - other.Y) / dist * diff;
            }
        }

        if (alignCount > 0)
        {
            b.Ax += (alignX / alignCount - b.Vx) * _alignForce;
            b.Ay += (alignY / alignCount - b.Vy) * _alignForce;
        }
        if (cohCount > 0)
        {
            b.Ax += (cohX / cohCount - b.X) * _cohForce / 100;
            b.Ay += (cohY / cohCount - b.Y) * _cohForce / 100;
        }
        b.Ax += sepX * _sepForce;
        b.Ay += sepY * _sepForce;
    }

    private void ApplyEdgeAvoidance(Boid b, double w, double h)
    {
        if (b.X < EdgeMargin) b.Ax += _edgeTurnForce;
        if (b.X > w - EdgeMargin) b.Ax -= _edgeTurnForce;
        if (b.Y < EdgeMargin) b.Ay += _edgeTurnForce;
        if (b.Y > h - EdgeMargin) b.Ay -= _edgeTurnForce;
    }

    private void ApplyWander(Boid b)
    {
        b.Ax += (_rng.NextDouble() - 0.5) * _wanderForce;
        b.Ay += (_rng.NextDouble() - 0.5) * _wanderForce;
    }

    public override void Render(DrawingContext ctx)
    {
        base.Render(ctx);
        var w = Bounds.Width;
        var h = Bounds.Height;
        if (w < 10 || h < 10) return;

        // Central logo: pulsing circle with rotation (matches AnimatedBackground.tsx)
        var cx = w / 2;
        var cy = h / 2;
        var throb = 1.0 + 0.1 * Math.Sin(_elapsed * 2 * Math.PI / _logoThrobSpeed);
        var logoR = LogoRadius * throb;

        using (ctx.PushTransform(Matrix.CreateTranslation(-cx, -cy)
            * Matrix.CreateRotation(_logoRotation * Math.PI / 180)
            * Matrix.CreateTranslation(cx, cy)))
        {
            // Outer glow
            var glowBrush = new SolidColorBrush(Color.FromArgb(
                (byte)(LogoOpacity * 0.3 * 255), 0x58, 0x65, 0xF2));
            ctx.DrawEllipse(glowBrush, null, new Point(cx, cy), logoR * 1.5, logoR * 1.5);

            // Core circle
            var logoBrush = new SolidColorBrush(Color.FromArgb(
                (byte)(LogoOpacity * 255), 0x58, 0x65, 0xF2));
            ctx.DrawEllipse(logoBrush, null, new Point(cx, cy), logoR, logoR);
        }

        // Draw boids with throb and rotation
        foreach (var b in _boids)
        {
            var alpha = (byte)(b.Opacity * 255);
            if (alpha < 1) continue;

            var boidThrob = 1.0 + Math.Sin(b.ThrobPhase) * 0.1;
            var size = b.Size * boidThrob;

            using (ctx.PushTransform(Matrix.CreateTranslation(-b.X, -b.Y)
                * Matrix.CreateRotation(b.Rotation * Math.PI / 180)
                * Matrix.CreateScale(boidThrob, boidThrob)
                * Matrix.CreateTranslation(b.X, b.Y)))
            {
                // Glow
                var glowBrush = new SolidColorBrush(Color.FromArgb(
                    (byte)(alpha / 3), 0x58, 0x65, 0xF2));
                ctx.DrawEllipse(glowBrush, null, new Point(b.X, b.Y), size * 2.5, size * 2.5);

                // Core
                var coreBrush = new SolidColorBrush(Color.FromArgb(alpha, 0x7A, 0xA2, 0xF7));
                ctx.DrawEllipse(coreBrush, null, new Point(b.X, b.Y), size, size);
            }
        }
    }

    private static double Clamp(double val, double min, double max) =>
        val < min ? min : val > max ? max : val;

    // --- Test API ---
    public int BoidCount => _boids.Count;
    public IReadOnlyList<Boid> Boids => _boids;
    public double CurrentAlignForce => _alignForce;
    public double CurrentCohForce => _cohForce;

    public void AddBoid(double x, double y, double vx, double vy)
    {
        _boids.Add(new Boid { X = x, Y = y, Vx = vx, Vy = vy, Size = MinBoidSize, Opacity = MaxBoidOpacity });
    }

    public void SimulateStep(double width, double height)
    {
        UpdateStochasticParams();
        double spawnProb = SpawnProbBase * Math.Exp(-SpawnProbDecay * _boids.Count) / 60.0;
        if (_boids.Count < MaxBoids && _rng.NextDouble() < spawnProb)
            SpawnBoid(width, height);
        // Fill to max for predictable testing
        while (_boids.Count < MaxBoids)
            SpawnBoid(width, height);

        var cx = width / 2;
        var cy = height / 2;
        for (int i = 0; i < _boids.Count; i++)
        {
            var b = _boids[i];
            b.ThrobPhase += b.ThrobSpeed;
            b.Rotation += b.RotationSpeed;

            var ldx = b.X - cx;
            var ldy = b.Y - cy;
            var ldist = Math.Sqrt(ldx * ldx + ldy * ldy);
            if (ldist < LogoDetectionRadius && ldist > 0.01)
            {
                b.Vx += (ldx / ldist) * LogoBounceForce;
                b.Vy += (ldy / ldist) * LogoBounceForce;
            }

            ApplyFlocking(b, i);
            ApplyEdgeAvoidance(b, width, height);
            ApplyWander(b);
            b.Vx = Clamp(b.Vx + b.Ax, -BaseSpeed * 2, BaseSpeed * 2);
            b.Vy = Clamp(b.Vy + b.Ay, -BaseSpeed * 2, BaseSpeed * 2);
            var speed = Math.Sqrt(b.Vx * b.Vx + b.Vy * b.Vy);
            if (speed > BaseSpeed * 2) { b.Vx = b.Vx / speed * BaseSpeed * 2; b.Vy = b.Vy / speed * BaseSpeed * 2; }
            b.X += b.Vx;
            b.Y += b.Vy;
            b.Ax = 0;
            b.Ay = 0;
            if (b.Opacity < MaxBoidOpacity) b.Opacity = Math.Min(b.Opacity + 0.0003, MaxBoidOpacity);
        }
    }
}

public class Boid
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Vx { get; set; }
    public double Vy { get; set; }
    public double Ax { get; set; }
    public double Ay { get; set; }
    public double Opacity { get; set; }
    public double Size { get; set; } = 6;
    public double Rotation { get; set; }
    public double RotationSpeed { get; set; }
    public double ThrobPhase { get; set; }
    public double ThrobSpeed { get; set; } = 0.02;
    public bool Entering { get; set; }
    public bool Leaving { get; set; }
}
