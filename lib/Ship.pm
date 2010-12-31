package Ship;

use strict;
use warnings;

use Moose;
use Math::Trig ':pi';
use Math::Geometry::Planar;

has [ qw/ x y/ ] => (
    is => 'rw', 
    default => 0,
);
has heading => (
    is => 'rw', 
    default =>0,
);
has velocity => (
    is => 'rw', 
    default =>0,
);

has id => (
    is => 'rw', 
    required => 1 );

has engine_rating => (
    is => 'rw',
    default => 6,
);

has trajectory => (
    is => 'rw',
);

has course_result => (
    is => 'rw',
);

sub move {
    my $self = shift;

    my ( $x, $y, $h, $v ) = @{ $self->course_result };

    $self->x($x);
    $self->y($y);
    $self->heading($h);
    $self->velocity($v);

    return;
}

sub set_course {
    my $self = shift;
    my $command = shift;

    $command =~ s/\s//g;

    my @log;

    my ( $rotation, $direction, $thrust ) = $command =~ / (\d+) ([PS]) ([-+]\d+) /xi;
        
    unless (  $command =~ / (\d+) ([PS]) ([-+]\d+) /xi ) {
        push @log, "What? Can't understand what you're saying, capt'n!";
        return @log;
    };

    my $position = [ $self->x, $self->y ],
    my $heading = $self->heading;
    my $velocity = $self->velocity;

    if ( uc($direction) eq 'P' ) {
        $rotation *= -1;
    }


    $rotation *= pi / 6;

    my $trajectory = "M". join( ',', $self->x, $self->y );

for (1..2) {
    $heading += $rotation / 2;
    $position->[0] += 100 * $velocity / 2 * sin $heading;
    $position->[1] += 100 * $velocity / -2 * cos $heading;

    $trajectory .= ' L ' . join ",", @$position; 
}

$velocity += $thrust;

    $self->course_result([
        @$position, $heading, $velocity
    ]);

    my $middle = LineIntersection([ [ $self->x, $self->y ], [$self->x +
    sin $self->heading, $self->y - cos $self->heading ], $position, [
    $position->[0] + sin $heading, $position->[1] - cos $heading ] ]);


    $self->trajectory($trajectory);

    return @log;
}

1;


