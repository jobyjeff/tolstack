// What KIND of surface a tessellated STEP face is, read off its own triangles.
//
// This file is geometry and nothing else: no DOM, no fetch, no three.js, and
// no vocabulary of the stack -- the same DOM-free half commands.js and
// binding_state.js are, for the same reason (run_tests.cjs can load it, and
// scene.js cannot be loaded there at all). scene.js supplies the buffers and
// caches the answer; the arithmetic lives here so a threshold can be measured
// rather than believed.
//
// It exists for the face-suggestion surface (handoff annotate_face_suggestions,
// 2026-09-21): a diameter needs a cylindrical face, a thickness needs planar
// ones, and narrowing a 1621-face mesh down to the handful that could possibly
// be the feature is the whole of the help this offers. It is NOT measurement --
// `radius` and `offset` are computed here because a *relation* between two
// faces (coaxial, parallel) cannot be tested without them, and they are never
// written into a binding event, never rendered as a dimension, and never
// allowed near a stack value. docs/ANNOTATION_SURFACE.md's decision 1 (no
// measurement from geometry) is unchanged by this file, and the suggestion
// surface's own section there says so in as many words.
//
// The one thing to know before touching a threshold: OCC's tessellation puts
// triangulation NODES exactly on the underlying surface, and lays a cylinder
// out as a grid of quads split into triangles -- so every facet of a cylinder
// has two vertices sharing an angular station, which makes that facet's normal
// exactly perpendicular to the axis, and every vertex exactly on the radius.
// The tolerances below are therefore slack for numerical noise and for
// irregular triangles at a trimmed boundary, NOT for a tessellation error that
// grows with `linear_deflection`. Measured hit rates over the installed meshes
// are in docs/sessions/lessons/LESSONS_20260921_annotate_face_suggestions.md,
// and re-measured by run_tests.cjs's [real] tier on every run.
(function (AA) {
  "use strict";

  // The vocabulary. A module-level constant, paired against its consumers by
  // run_tests.cjs -- CLAUDE.md's standing rule, and a class name spelled twice
  // is this repo's most-repeated defect.
  //
  // THREE classes and not two: "other" is a first-class answer, the same
  // posture docs/spec_library/README.md takes for an unreadable value. A
  // sphere, a cone, a torus, a swept blade surface and a face whose triangles
  // are too degenerate to read all land here, and a face here is suggested for
  // nothing -- never rounded up to the nearest class that would have made the
  // candidate list look complete.
  AA.SURFACE_CLASSES = Object.freeze(["planar", "cylindrical", "other"]);

  // Every threshold this file applies, in one frozen block, so a run can print
  // them beside the hit rates they produced. All of them are ANGLES or
  // FRACTIONS -- nothing here is a length, so the module never assumes what a
  // mesh's native unit is (`area_native2`/`centroid_native` are named the way
  // they are for the same reason).
  AA.FACE_CLASSIFY = Object.freeze({
    // A planar face's facet normals are parallel to machine precision, so this
    // only has to absorb float32 positions and irregular boundary triangles.
    planarNormalDeg: 1.0,
    // ...and its vertices sit in that plane, to a fraction of the face's own
    // extent. Both are checked: parallel normals alone would accept a shallow
    // cone read through a narrow band of facets.
    planarFlatnessFraction: 0.002,
    // A cylinder's facet normals are perpendicular to its axis.
    cylinderAxisDeg: 2.0,
    // ...and its vertices are all at one radius, to this fraction of it. Two
    // percent and not one: measured over the installed meshes, a genuine
    // cylinder's residual is 1e-8 relative when the radius is large and climbs
    // to ~1e-2 on a 1 mm fillet, because float32 positions carry an ABSOLUTE
    // error set by the part's coordinate magnitude and this test divides it by
    // the radius. One percent cost 1000 real bores and fillets; the population
    // above two percent is 41 faces and none of them is round.
    cylinderRadialFraction: 0.02,
    // A cylinder read from too narrow an arc has a well-determined axis
    // DIRECTION and a badly-determined axis POSITION, which is exactly what
    // the coaxial test needs. Below this sweep the face is "other": a fillet
    // suggested as a bore is worse than a fillet suggested as nothing. Ten
    // degrees, measured: the fits stay good well below it (the residual
    // histogram does not widen until the arc is under 5 degrees), and 25
    // degrees -- the first value tried -- refused 700 real cylindrical walls
    // and fillets whose axis the coaxial test then had no trouble with.
    cylinderMinArcDeg: 10.0,
    // A triangle this much smaller than its face's largest is a sliver at a
    // trimmed boundary. It still carries its (tiny) area weight, but it is not
    // allowed to fail a normal-direction check on its own.
    sliverAreaFraction: 1e-4,
    // ...and a whole FACE this much smaller than the part's largest is a
    // tessellation artefact, not a feature: the NAS6403U11D bolt carries two
    // three-triangle faces that fit a circle of radius 0.003 in a part 25 long.
    // They are "other" with a reason, rather than two candidates a reader is
    // invited to click and cannot see. A ratio, so it needs no unit and no
    // knowledge of how big the part is.
    degenerateAreaFraction: 1e-6,
  });

  // Faces are appended in face_id order (0..N-1, dense) and each face's
  // triangulation nodes occupy a contiguous run of the flat vertex buffer --
  // see rotorkit/stepgeom/tessellate.py's own docstring for why a cumulative
  // sum over the manifest gives each face's vertex range with no index scan.
  //
  // Here rather than in scene.js (where it lived until 2026-09-21) because
  // this file needs it too, and a second copy of a traversal contract is a
  // second place to get it wrong; scene.js calls it through AA, the way it
  // already calls AA.faceSubGeometry.
  AA.faceVertexRanges = function (manifestFaces) {
    var ranges = new Array(manifestFaces.length);
    var offset = 0;
    for (var i = 0; i < manifestFaces.length; i++) {
      var f = manifestFaces[i];
      ranges[f.face_id] = { start: offset, count: f.n_vertices };
      offset += f.n_vertices;
    }
    return ranges;
  };

  // --- small vector helpers -------------------------------------------------
  // Local, not exported: three.js owns this job everywhere the scene is
  // involved, and this file must not import it.

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) { return Math.sqrt(dot(a, a)); }
  function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function unit(a) {
    var n = norm(a);
    return n > 0 ? scale(a, 1 / n) : [0, 0, 0];
  }
  function deg(radians) { return radians * 180 / Math.PI; }
  function angleBetweenDeg(a, b) {
    // Clamped: a dot product of 1.0000000002 is an ordinary float32 artefact,
    // and Math.acos of it is NaN -- which would read as "not parallel".
    var c = Math.max(-1, Math.min(1, dot(unit(a), unit(b))));
    return deg(Math.acos(c));
  }
  // Two directions treated as the SAME direction when they differ by a flip:
  // a face's outward normal and its neighbour's point away from each other,
  // and a thickness is measured between exactly that pair.
  function axialAngleDeg(a, b) {
    var angle = angleBetweenDeg(a, b);
    return Math.min(angle, 180 - angle);
  }

  // Jacobi eigendecomposition of a symmetric 3x3, given as
  // [m00, m01, m02, m11, m12, m22]. Returns {values, vectors} sorted by
  // DESCENDING eigenvalue.
  //
  // Written out rather than solved by the closed-form cubic: the cubic loses
  // most of its precision exactly where this is used, on a near-degenerate
  // matrix (a plane's normal covariance has two eigenvalues at ~0), and the
  // eigenVECTOR of the smallest eigenvalue is the answer the cylinder test
  // depends on.
  AA.eigenSymmetric3 = function (m) {
    var a = [[m[0], m[1], m[2]], [m[1], m[3], m[4]], [m[2], m[4], m[5]]];
    var v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    var k;
    for (var sweep = 0; sweep < 32; sweep++) {
      var off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
      if (off < 1e-16) break;
      for (var p = 0; p < 2; p++) {
        for (var q = p + 1; q < 3; q++) {
          if (Math.abs(a[p][q]) < 1e-20) continue;
          var theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          var sign = theta >= 0 ? 1 : -1;
          var t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          var c = 1 / Math.sqrt(t * t + 1);
          var s = t * c;
          for (k = 0; k < 3; k++) {
            var akp = a[k][p], akq = a[k][q];
            a[k][p] = c * akp - s * akq;
            a[k][q] = s * akp + c * akq;
          }
          for (k = 0; k < 3; k++) {
            var apk = a[p][k], aqk = a[q][k];
            a[p][k] = c * apk - s * aqk;
            a[q][k] = s * apk + c * aqk;
          }
          for (k = 0; k < 3; k++) {
            var vkp = v[k][p], vkq = v[k][q];
            v[k][p] = c * vkp - s * vkq;
            v[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    var order = [0, 1, 2].sort(function (i, j) { return a[j][j] - a[i][i]; });
    return {
      values: order.map(function (i) { return a[i][i]; }),
      vectors: order.map(function (i) { return [v[0][i], v[1][i], v[2][i]]; }),
    };
  };

  // Algebraic (Kasa) circle fit over 2D points: minimise the residual of
  // x^2 + y^2 + Dx + Ey + F = 0, which is linear in (D, E, F). Returns null
  // when the normal equations are singular -- collinear projections, which is
  // what a too-narrow cylindrical arc looks like, and a guessed centre there
  // would be a guessed axis.
  //
  // Exported so a test can fit points it built by hand and check the fit
  // itself, rather than only ever seeing it through a classification.
  AA.fitCircle2 = function (xs, ys) {
    var n = xs.length;
    if (n < 3) return null;
    var sxx = 0, sxy = 0, sx = 0, syy = 0, sy = 0;
    var bx = 0, by = 0, bn = 0;
    for (var i = 0; i < n; i++) {
      var x = xs[i], y = ys[i], z = x * x + y * y;
      sxx += x * x; sxy += x * y; sx += x;
      syy += y * y; sy += y;
      bx -= z * x; by -= z * y; bn -= z;
    }
    // The symmetric normal-equation matrix, solved by Cramer's rule:
    //   [sxx sxy sx] [D]   [bx]
    //   [sxy syy sy] [E] = [by]
    //   [sx  sy  n ] [F]   [bn]
    var m = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
    var rhs = [bx, by, bn];
    var det = det3(m);
    // Scale-free singularity test: compare against the matrix's own magnitude,
    // so a small part and a large one are judged the same way.
    var magnitude = Math.max(Math.abs(sxx), Math.abs(syy), 1e-30) * Math.max(n, 1);
    if (!isFinite(det) || Math.abs(det) < 1e-12 * magnitude * magnitude) return null;
    var D = det3(withColumn(m, 0, rhs)) / det;
    var E = det3(withColumn(m, 1, rhs)) / det;
    var F = det3(withColumn(m, 2, rhs)) / det;
    var cx = -D / 2, cy = -E / 2;
    var r2 = cx * cx + cy * cy - F;
    if (!(r2 > 0)) return null;
    return { cx: cx, cy: cy, r: Math.sqrt(r2) };
  };

  function det3(m) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
      - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
      + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  }

  function withColumn(m, column, values) {
    return m.map(function (row, i) {
      var copy = row.slice();
      copy[column] = values[i];
      return copy;
    });
  }

  // --- the classifier -------------------------------------------------------
  //
  // ONE pass over the triangle buffer, bucketed by face id, then per-face work
  // over that face's own contiguous vertex run. Written this way on purpose:
  // AA.faceSubGeometry scans every triangle to find one face's, which is right
  // for the one face a reader marked and is O(faces x triangles) -- 192 million
  // iterations on the 2376-face pitch plate -- if a whole part is classified
  // that way.

  function accumulator() {
    return { area: 0, n: [0, 0, 0], m: [0, 0, 0, 0, 0, 0], triangles: 0, maxTriArea: 0 };
  }

  // Per-face triangle sums: total area, the area-weighted normal, and the
  // area-weighted normal covariance whose eigenvectors separate the classes.
  function accumulateTriangles(positions, indices, faceIdPerTriangle, nFaces) {
    var acc = new Array(nFaces);
    for (var f = 0; f < nFaces; f++) acc[f] = accumulator();
    var triangles = faceIdPerTriangle.length;
    for (var t = 0; t < triangles; t++) {
      var a = acc[faceIdPerTriangle[t]];
      if (!a) continue; // a face id outside the manifest: the manifest wins
      var tri = triangleNormal(positions, indices, t);
      a.triangles++;
      if (!tri) continue; // a degenerate triangle has no normal to read
      var w = tri.area, n = tri.normal;
      a.area += w;
      if (w > a.maxTriArea) a.maxTriArea = w;
      a.n[0] += w * n[0]; a.n[1] += w * n[1]; a.n[2] += w * n[2];
      a.m[0] += w * n[0] * n[0]; a.m[1] += w * n[0] * n[1]; a.m[2] += w * n[0] * n[2];
      a.m[3] += w * n[1] * n[1]; a.m[4] += w * n[1] * n[2]; a.m[5] += w * n[2] * n[2];
    }
    return acc;
  }

  function triangleNormal(positions, indices, t) {
    var i0 = indices[t * 3] * 3, i1 = indices[t * 3 + 1] * 3, i2 = indices[t * 3 + 2] * 3;
    var e1 = [positions[i1] - positions[i0],
      positions[i1 + 1] - positions[i0 + 1],
      positions[i1 + 2] - positions[i0 + 2]];
    var e2 = [positions[i2] - positions[i0],
      positions[i2 + 1] - positions[i0 + 1],
      positions[i2 + 2] - positions[i0 + 2]];
    var c = cross(e1, e2);
    var twiceArea = norm(c);
    if (!(twiceArea > 0)) return null;
    return { area: twiceArea / 2, normal: [c[0] / twiceArea, c[1] / twiceArea, c[2] / twiceArea] };
  }

  // The widest deviation, per face, of a facet normal from (i) that face's own
  // mean normal and (ii) the plane perpendicular to that face's candidate axis
  // -- both needing the first pass's answers, so both are a second pass.
  // Slivers (FACE_CLASSIFY.sliverAreaFraction) are excluded from the MAXIMA
  // only: they still carry their area weight above.
  function accumulateDeviations(positions, indices, faceIdPerTriangle, acc, meanNormals, axes, tol) {
    var worst = acc.map(function () { return { normalDeg: 0, axisDeg: 0 }; });
    var triangles = faceIdPerTriangle.length;
    for (var t = 0; t < triangles; t++) {
      var faceId = faceIdPerTriangle[t];
      var a = acc[faceId];
      if (!a) continue;
      var tri = triangleNormal(positions, indices, t);
      if (!tri) continue;
      if (tri.area < a.maxTriArea * tol.sliverAreaFraction) continue;
      var w = worst[faceId];
      var mean = meanNormals[faceId];
      if (mean) {
        var d = angleBetweenDeg(tri.normal, mean);
        if (d > w.normalDeg) w.normalDeg = d;
      }
      var axis = axes[faceId];
      if (axis) {
        // How far off perpendicular this facet is: 90 degrees is perfect.
        var off = Math.abs(90 - angleBetweenDeg(tri.normal, axis));
        if (off > w.axisDeg) w.axisDeg = off;
      }
    }
    return worst;
  }

  // Classify every face of one part. `positions` is the flat xyz buffer,
  // `indices` the triangle index buffer, `faceIdPerTriangle` the per-triangle
  // face id, `manifestFaces` the manifest's own face table -- which is what
  // decides how many faces there are, never the buffers.
  //
  // Returns an array indexed by face_id. Every entry carries `faceId` and
  // `surface` (one of AA.SURFACE_CLASSES); the rest is per class, and "other"
  // carries `why` in this module's own words so a run can report what missed.
  AA.classifyPartFaces = function (manifestFaces, positions, indices, faceIdPerTriangle, tolerances) {
    var tol = Object.assign({}, AA.FACE_CLASSIFY, tolerances || {});
    var faces = manifestFaces || [];
    var nFaces = faces.length;
    var largestFaceArea = 0;
    for (var h = 0; h < nFaces; h++) {
      if ((faces[h].area_native2 || 0) > largestFaceArea) largestFaceArea = faces[h].area_native2;
    }
    var ranges = AA.faceVertexRanges(faces);
    var acc = accumulateTriangles(positions, indices, faceIdPerTriangle, nFaces);

    // Per face: the mean normal, and the candidate axis (the normal
    // covariance's LEAST eigenvector -- for a cylinder the facet normals span
    // the plane perpendicular to the axis, so the direction they never point
    // in IS the axis).
    var meanNormals = new Array(nFaces);
    var axes = new Array(nFaces);
    for (var f = 0; f < nFaces; f++) {
      var a = acc[f];
      if (!a || a.area <= 0) continue;
      meanNormals[f] = unit(a.n);
      var e = AA.eigenSymmetric3([
        a.m[0] / a.area, a.m[1] / a.area, a.m[2] / a.area,
        a.m[3] / a.area, a.m[4] / a.area, a.m[5] / a.area,
      ]);
      axes[f] = unit(e.vectors[2]);
    }
    var worst = accumulateDeviations(positions, indices, faceIdPerTriangle, acc,
      meanNormals, axes, tol);

    var out = new Array(nFaces);
    for (var g = 0; g < nFaces; g++) {
      var faceId = faces[g].face_id;
      out[faceId] = (largestFaceArea > 0 &&
        (faces[g].area_native2 || 0) < tol.degenerateAreaFraction * largestFaceArea)
        ? other(faceId, "a sliver too small to be a feature")
        : classifyOne(faces[g], ranges[faceId], positions, acc[faceId],
          meanNormals[faceId], axes[faceId], worst[faceId], tol);
    }
    return out;
  };

  function other(faceId, why) {
    return { faceId: faceId, surface: "other", why: why };
  }

  function classifyOne(manifestFace, range, positions, acc, meanNormal, axis, worst, tol) {
    var faceId = manifestFace.face_id;
    if (!acc || acc.area <= 0 || !meanNormal || !range || range.count < 3) {
      return other(faceId, "no readable triangles");
    }
    // The face's own vertices, once: both remaining tests read them.
    var vs = [];
    for (var i = range.start; i < range.start + range.count; i++) {
      vs.push([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
    }
    var centroid = [0, 0, 0];
    for (var j = 0; j < vs.length; j++) {
      centroid[0] += vs[j][0]; centroid[1] += vs[j][1]; centroid[2] += vs[j][2];
    }
    centroid = scale(centroid, 1 / vs.length);
    var extent = 0;
    for (var k = 0; k < vs.length; k++) {
      var d = norm(sub(vs[k], centroid));
      if (d > extent) extent = d;
    }

    // --- planar -------------------------------------------------------------
    if (worst.normalDeg <= tol.planarNormalDeg) {
      var flat = 0;
      for (var p = 0; p < vs.length; p++) {
        var off = Math.abs(dot(sub(vs[p], centroid), meanNormal));
        if (off > flat) flat = off;
      }
      if (extent <= 0 || flat <= tol.planarFlatnessFraction * extent) {
        return {
          faceId: faceId, surface: "planar",
          normal: meanNormal,
          // The plane as (normal, offset): offset is normal . point, so two
          // planes in ONE mesh's frame are coplanar when their offsets agree.
          offset: dot(meanNormal, centroid),
          normalSpreadDeg: worst.normalDeg,
          flatness: extent > 0 ? flat / extent : 0,
        };
      }
      return other(faceId, "parallel facet normals but the vertices are not in one plane");
    }

    // --- cylindrical --------------------------------------------------------
    if (!axis) return other(faceId, "no axis could be read");
    if (worst.axisDeg > tol.cylinderAxisDeg) {
      return other(faceId, "facet normals do not lie in one plane -- neither a plane nor a cylinder");
    }
    // Project the vertices into the plane perpendicular to the axis and fit a
    // circle. The basis is arbitrary but must be stable: build it off the
    // axis's own smallest component, so `u` is never near-parallel to it.
    var seed = (Math.abs(axis[0]) <= Math.abs(axis[1]) && Math.abs(axis[0]) <= Math.abs(axis[2]))
      ? [1, 0, 0]
      : (Math.abs(axis[1]) <= Math.abs(axis[2]) ? [0, 1, 0] : [0, 0, 1]);
    var u = unit(cross(axis, seed));
    var v = unit(cross(axis, u));
    var xs = [], ys = [];
    for (var q = 0; q < vs.length; q++) {
      var rel = sub(vs[q], centroid);
      xs.push(dot(rel, u)); ys.push(dot(rel, v));
    }
    var fit = AA.fitCircle2(xs, ys);
    if (!fit || !(fit.r > 0)) {
      return other(faceId, "the cross-section is too flat to be a circle");
    }
    var radial = 0;
    var angles = [];
    for (var s = 0; s < xs.length; s++) {
      var dx = xs[s] - fit.cx, dy = ys[s] - fit.cy;
      var err = Math.abs(Math.sqrt(dx * dx + dy * dy) - fit.r);
      if (err > radial) radial = err;
      angles.push(Math.atan2(dy, dx));
    }
    if (radial > tol.cylinderRadialFraction * fit.r) {
      return other(faceId, "the cross-section is not one circle");
    }
    var arc = AA.angularSpreadDeg(angles);
    if (arc < tol.cylinderMinArcDeg) {
      return other(faceId, "too narrow an arc to place an axis");
    }
    return {
      faceId: faceId, surface: "cylindrical",
      axis: axis,
      // A point ON the axis, in this mesh's own frame -- what the coaxial test
      // measures a distance to.
      axisPoint: [
        centroid[0] + u[0] * fit.cx + v[0] * fit.cy,
        centroid[1] + u[1] * fit.cx + v[1] * fit.cy,
        centroid[2] + u[2] * fit.cx + v[2] * fit.cy,
      ],
      radius: fit.r,
      arcDeg: arc,
      axisSpreadDeg: worst.axisDeg,
      radialError: radial / fit.r,
    };
  }

  // How much of a full turn a set of angles covers: the turn minus its widest
  // empty wedge. A half cylinder answers 180 and a fillet a few degrees --
  // and, unlike max-minus-min, it is not fooled by an arc that straddles the
  // +/-pi branch cut.
  //
  // A CLOSED loop answers 360 minus one station spacing, not 360: with no
  // duplicate station at the seam, the gap between the last station and the
  // first is a real gap as far as this function can tell. That costs nothing
  // -- the threshold it feeds is 10 degrees, and a closed cylinder tessellated
  // coarsely enough for the shortfall to matter would be 36 facets short of
  // being round -- and the alternative (deciding that a small gap is not a
  // real gap) is a second threshold guarding a case that never arises.
  AA.angularSpreadDeg = function (angles) {
    if (!angles || angles.length < 2) return 0;
    var sorted = angles.slice().sort(function (a, b) { return a - b; });
    var widestGap = (sorted[0] + 2 * Math.PI) - sorted[sorted.length - 1];
    for (var i = 1; i < sorted.length; i++) {
      var gap = sorted[i] - sorted[i - 1];
      if (gap > widestGap) widestGap = gap;
    }
    return Math.max(0, deg(2 * Math.PI - widestGap));
  };

  // --- relations between two classified faces -------------------------------
  //
  // Each of these is a predicate over two classifications and a tolerance
  // block; none of them knows what a stack element is. WHICH relation applies
  // WHEN is the suggestion rule table's job (suggestions.js), not this file's.
  //
  // `offset`, `axisPoint` and every distance below are in ONE MESH'S OWN
  // FRAME. This app applies no assembly placement transforms
  // (docs/ANNOTATION_SURFACE.md, "What this MVP does not build"), so parallel
  // and coaxial are only meaningful between two faces of the SAME mesh -- and
  // the rule table is what refuses to ask them across meshes.
  AA.FACE_RELATION_TOLERANCES = Object.freeze({
    parallelDeg: 2.0,
    coaxialDeg: 2.0,
    // Of the larger reference radius: a bore and the shaft in it are coaxial
    // to a small fraction of their own size, wherever they sit in the part.
    coaxialDistanceFraction: 0.05,
    // A fit: two mating diameters agree to about this much, and this is the
    // ONLY relation that survives having no placement transform, because a
    // radius is a property of one face rather than of a pair of frames.
    radiusFraction: 0.02,
  });

  AA.facesParallel = function (a, b, tolerances) {
    var tol = Object.assign({}, AA.FACE_RELATION_TOLERANCES, tolerances || {});
    if (!a || !b || a.surface !== "planar" || b.surface !== "planar") return false;
    return axialAngleDeg(a.normal, b.normal) <= tol.parallelDeg;
  };

  AA.facesCoaxial = function (a, b, tolerances) {
    var tol = Object.assign({}, AA.FACE_RELATION_TOLERANCES, tolerances || {});
    if (!a || !b || a.surface !== "cylindrical" || b.surface !== "cylindrical") return false;
    if (axialAngleDeg(a.axis, b.axis) > tol.coaxialDeg) return false;
    // Distance between the two axis LINES: the component of the
    // point-to-point offset perpendicular to the shared direction.
    var direction = unit(a.axis);
    var delta = sub(b.axisPoint, a.axisPoint);
    var perpendicular = norm(sub(delta, scale(direction, dot(delta, direction))));
    return perpendicular <= tol.coaxialDistanceFraction * Math.max(a.radius, b.radius);
  };

  AA.radiiMatch = function (a, b, tolerances) {
    var tol = Object.assign({}, AA.FACE_RELATION_TOLERANCES, tolerances || {});
    if (!a || !b || a.surface !== "cylindrical" || b.surface !== "cylindrical") return false;
    var reference = Math.max(a.radius, b.radius);
    if (!(reference > 0)) return false;
    return Math.abs(a.radius - b.radius) <= tol.radiusFraction * reference;
  };
})(window.AnnotateApp = window.AnnotateApp || {});
