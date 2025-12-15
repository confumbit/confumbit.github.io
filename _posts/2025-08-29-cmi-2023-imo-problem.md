---
layout: post
title: A modified IMO 2017 problem.
---

This problem appeared in the CMI UG 2023 Entrance Examination.
<br><br>
<b>Question.</b>
Starting with any given positive integer \(a > 1\) the following game is
played. If \(a\) is a perfect square, take its square root. Otherwise
take \(a + 3\). Repeat the procedure with the new positive integer
(i.e., with \(\sqrt{a}\) or \(a + 3\) depending on the case). The
resulting set of numbers is called the trajectory of \(a\). For example
the set \(\{3, 6, 9\}\) is a trajectory: it is the trajectory of each of
its members. Which numbers have a finite trajectory?
<br />
<br />
<b>Proof.</b>
All positive integers \(a > 1\) can be written as \(3n+2, 3n+3, 3n+4\)
where \(n \in \mathbb{N}\). \[ (3k+2)^2 = 9k^2 + 4 + 12k = 3(3k^2+4k)+4
\] \[ (3k+3)^2 = 9k^2 + 9 + 18k = 3(3k^2+6k+2)+3 \] \[ (3k+4)^2 = 9k^2 +
16 + 24k = 3(3k^2+8k+4)+4 \] Hence, a perfect square can be of the forms
\(3n'+4, 3n'+3, n' \in \mathbb{N}\). Let us represent these trajectories
as recursively defined sequences \((a_n)\). \[ a_{n+1} = \begin{cases}
a_n+3 & a_n \text{ is not a perfect square} \\ \sqrt{a_n} & a_n \text{
is a perfect square} \end{cases} \]

<b>Case (i):</b> \(a\) is of the form \(3n+2\). Since a perfect square
can never be of this form, every sequence starting with \(a\) in this
form will be infinite.
<br />
<br />
<b>Case (ii):</b> \(a\) is of the form \(3n+3\). Since there are an
infinite number of perfect squares of the form \(3k+3\), every sequence
with the starting number \(a\) of the form \(3n+3\) will have a perfect
square in its trajectory and will circle back to a number earlier in the
sequence. Hence, sequences with a starting number of this form will be
finite.
<br />
<br />
<b>Case (iii):</b> \(a\) is of the form \(3n+4\). Similar to Case (ii),
sequences of this form will be finite. Hence every starting number \(a\)
of the forms \(3n+3, 3n+4, n \in \mathbb{N}\) will be a finite sequence.

<div style="text-align: right; width: 100%;">\(\blacksquare\)</div>

<a href="https://www.cmi.ac.in/admissions/sample-qp/ugmath2023.pdf">
Link to the original CMI Entrance Problem.
</a> <br />
<a href="https://www.imo-official.org/problems/IMO2017SL.pdf#section*.35">
Link to the original IMO 2017 Problem.
</a>
